import assert from "node:assert/strict";

import { Connection } from "@/models/connection";
import { Topic } from "@/models/topic";
import {
  DirectoryUserService,
  LocalDirectoryUserService
} from "@/services/directoryUsers";
import { JsonStorage } from "@/services/localJsonStorage";
import { LocalConnectionService } from "@/services/connectionService";
import { LocalTopicService } from "@/services/topicService";
import { LocalUserService } from "@/services/userService";

declare function test(name: string, run: () => Promise<void> | void): void;

class MemoryJsonStorage implements JsonStorage {
  private values = new Map<string, string>();

  async read<T>(key: string): Promise<T | null> {
    const rawValue = this.values.get(key);

    return rawValue ? JSON.parse(rawValue) as T : null;
  }

  async write<T>(key: string, value: T): Promise<void> {
    this.values.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clearNamespace(namespace: string): Promise<void> {
    Array.from(this.values.keys())
      .filter((key) => key.startsWith(namespace))
      .forEach((key) => this.values.delete(key));
  }

}

interface ServiceSet {
  connections: LocalConnectionService;
  directory: DirectoryUserService;
  topics: LocalTopicService;
  users: LocalUserService;
}

test("saving an identity registers the user in the directory", async () => {
  const storage = new MemoryJsonStorage();
  const { directory, users } = createServices(storage);

  await users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  const efren = await users.updateDisplayName("Efren");
  const directoryUsers = await directory.listUsers();

  assert.equal(
    directoryUsers.some((directoryUser) => (
      directoryUser.id === efren.id &&
      directoryUser.displayName === "Efren" &&
      directoryUser.tag === "@efren"
    )),
    true
  );
});

test("a default directory creator is visible to a later phone claimant", async () => {
  const storage = new MemoryJsonStorage();

  const jaySession = createServices(storage);
  await jaySession.users.updateIdentifiers({ tag: "jay", phoneNumber: "" });
  await jaySession.users.updateDisplayName("jay");
  await jaySession.connections.addConnection("#27");
  const topic = await jaySession.topics.createTopic({
    title: "Jay phone invite",
    memberIds: ["phone:#27"]
  });

  const anonymousSession = createServices(storage);
  await anonymousSession.users.resetLocalData();
  assert.deepEqual(await anonymousSession.topics.listTopics(), []);

  const phone27Session = createServices(storage);
  await phone27Session.users.updateIdentifiers({ tag: "", phoneNumber: "27" });
  await phone27Session.users.updateDisplayName("the27");

  const visibleTopics = await phone27Session.topics.listTopics();
  const network = await phone27Session.connections.listConnections();

  assert.equal(visibleTopics.some((visibleTopic) => visibleTopic.id === topic.id), true);
  assert.equal(network.some((connection) => connection.tag === "@jay"), true);
  assertMemberDisplays(network, visibleTopics[0], ["jay", "the27"]);
});

test("a newly registered creator is visible to a later phone claimant", async () => {
  const storage = new MemoryJsonStorage();

  const efrenSession = createServices(storage);
  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Efren phone invite",
    memberIds: ["phone:#27"]
  });

  const anonymousSession = createServices(storage);
  await anonymousSession.users.resetLocalData();
  assert.deepEqual(await anonymousSession.topics.listTopics(), []);

  const phone27Session = createServices(storage);
  await phone27Session.users.updateIdentifiers({ tag: "", phoneNumber: "27" });
  await phone27Session.users.updateDisplayName("the27");

  const visibleTopics = await phone27Session.topics.listTopics();
  const network = await phone27Session.connections.listConnections();

  assert.equal(visibleTopics.some((visibleTopic) => visibleTopic.id === topic.id), true);
  assert.equal(network.some((connection) => connection.tag === "@efren"), true);
  assertMemberDisplays(network, visibleTopics[0], ["Efren", "the27"]);
});

test("claimed phone display names replace phone placeholders in later sessions", async () => {
  const storage = new MemoryJsonStorage();

  const efrenSession = createServices(storage);
  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Display name update",
    memberIds: ["phone:#27"]
  });

  const phone27Session = createServices(storage);
  await phone27Session.users.resetLocalData();
  await phone27Session.users.updateIdentifiers({ tag: "", phoneNumber: "27" });
  await phone27Session.users.updateDisplayName("the27");

  const returningEfrenSession = createServices(storage);
  await returningEfrenSession.users.resetLocalData();
  await returningEfrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await returningEfrenSession.users.updateDisplayName("Efren");

  const visibleTopics = await returningEfrenSession.topics.listTopics();
  const network = await returningEfrenSession.connections.listConnections();

  assert.equal(visibleTopics.some((visibleTopic) => visibleTopic.id === topic.id), true);
  assert.equal(network.some((connection) => connection.displayName === "the27"), true);
  assertMemberDisplays(network, visibleTopics[0], ["the27"]);
});

test("users without matching identity cannot see unrelated huddles", async () => {
  const storage = new MemoryJsonStorage();

  const efrenSession = createServices(storage);
  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  await efrenSession.topics.createTopic({
    title: "Private phone invite",
    memberIds: ["phone:#27"]
  });

  const unrelatedSession = createServices(storage);
  await unrelatedSession.users.resetLocalData();
  await unrelatedSession.users.updateIdentifiers({ tag: "maria", phoneNumber: "" });
  await unrelatedSession.users.updateDisplayName("Maria");

  assert.deepEqual(await unrelatedSession.topics.listTopics(), []);
});

test("tag-only identity cannot see a phone-invited huddle until claiming the matching phone", async () => {
  const storage = new MemoryJsonStorage();

  const efrenSession = createServices(storage);
  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Phone-gated invite",
    memberIds: ["phone:#27"]
  });

  const tagOnlySession = createServices(storage);
  await tagOnlySession.users.resetLocalData();
  await tagOnlySession.users.updateIdentifiers({ tag: "the27", phoneNumber: "" });
  await tagOnlySession.users.updateDisplayName("The 27");
  assert.deepEqual(await tagOnlySession.topics.listTopics(), []);

  const phoneClaimSession = createServices(storage);
  await phoneClaimSession.users.updateIdentifiers({ tag: "the27", phoneNumber: "27" });
  await phoneClaimSession.users.updateDisplayName("The 27");

  const visibleTopics = await phoneClaimSession.topics.listTopics();

  assert.equal(visibleTopics.some((visibleTopic) => visibleTopic.id === topic.id), true);
});

test("creating a huddle includes the creator as a member", async () => {
  const storage = new MemoryJsonStorage();

  const efrenSession = createServices(storage);
  const efren = await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");

  const topic = await efrenSession.topics.createTopic({
    title: "Creator included",
    memberIds: ["phone:#27"]
  });

  assert.equal(topic.memberIds.includes(efren.id), true);
});

test("updating huddle members does not remove the creator", async () => {
  const storage = new MemoryJsonStorage();

  const efrenSession = createServices(storage);
  const efren = await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Creator retained",
    memberIds: ["phone:#27"]
  });

  const updatedTopic = await efrenSession.topics.updateTopic(topic.id, {
    title: "Creator retained",
    memberIds: ["andre"]
  });

  assert.equal(updatedTopic.memberIds.includes(efren.id), true);
  assert.equal(updatedTopic.memberIds.includes("phone:#27"), false);
  assert.equal(updatedTopic.memberIds.includes("andre"), true);
});

function createServices(storage: JsonStorage): ServiceSet {
  const directory = new LocalDirectoryUserService(storage);
  const users = new LocalUserService(storage, directory);
  const topics = new LocalTopicService(storage, users, directory);
  const connections = new LocalConnectionService(storage, users, directory);

  return { connections, directory, topics, users };
}

function assertMemberDisplays(
  network: Connection[],
  topic: Topic,
  expectedNames: string[]
) {
  const displayNameByAlias = network.reduce<Record<string, string>>((namesByAlias, connection) => {
    const displayName = connection.displayName || connection.tag || connection.phoneNumber;
    [
      connection.id,
      connection.tag,
      connection.phoneNumber,
      connection.phoneNumber ? `phone:${connection.phoneNumber}` : ""
    ]
      .filter(Boolean)
      .forEach((alias) => {
        namesByAlias[alias] = displayName;
      });

    return namesByAlias;
  }, {});
  const memberDisplays = topic.memberIds
    .map((memberId) => displayNameByAlias[memberId])
    .filter((displayName): displayName is string => Boolean(displayName));

  expectedNames.forEach((expectedName) => {
    assert.equal(memberDisplays.includes(expectedName), true);
  });
}
