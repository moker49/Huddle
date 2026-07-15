import assert from "node:assert/strict";

import { Connection } from "@/models/connection";
import { Topic } from "@/models/topic";
import {
  DirectoryUserService,
  LocalDirectoryUserService
} from "@/services/directoryUsers";
import { JsonStorage } from "@/services/localJsonStorage";
import { LocalConnectionService } from "@/services/connectionService";
import { LocalMessageService } from "@/services/messageService";
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
  messages: LocalMessageService;
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

test("saving a tag strips pound symbols", async () => {
  const storage = new MemoryJsonStorage();
  const { users } = createServices(storage);

  const user = await users.updateIdentifiers({ tag: "#ef#r@en", phoneNumber: "" });

  assert.equal(user.tag, "@efren");
});

test("saving a phone strips tag and phone symbols", async () => {
  const storage = new MemoryJsonStorage();
  const { users } = createServices(storage);

  const user = await users.updateIdentifiers({ tag: "", phoneNumber: "#2@7" });

  assert.equal(user.phoneNumber, "#27");
});

test("saving a display name strips tag and phone symbols", async () => {
  const storage = new MemoryJsonStorage();
  const { users } = createServices(storage);

  await users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  const user = await users.updateDisplayName("@Ef#ren");

  assert.equal(user.displayName, "Efren");
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

test("shared huddles add members to each user's network", async () => {
  const storage = new MemoryJsonStorage();

  const efrenSession = createServices(storage);
  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("@jay");
  const topic = await efrenSession.topics.createTopic({
    title: "Shared network",
    memberIds: ["jay"]
  });

  const efrenNetwork = await efrenSession.connections.listConnections();
  assert.equal(efrenNetwork.some((connection) => connection.tag === "@jay"), true);

  const jaySession = createServices(storage);
  await jaySession.users.resetLocalData();
  await jaySession.users.updateIdentifiers({ tag: "jay", phoneNumber: "" });
  await jaySession.users.updateDisplayName("jay");

  const jayTopics = await jaySession.topics.listTopics();
  const jayNetwork = await jaySession.connections.listConnections();

  assert.equal(jayTopics.some((visibleTopic) => visibleTopic.id === topic.id), true);
  assert.equal(jayNetwork.some((connection) => connection.tag === "@efren"), true);
});

test("manually adding an unknown phone creates a placeholder connection", async () => {
  const storage = new MemoryJsonStorage();
  const efrenSession = createServices(storage);

  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  const connection = await efrenSession.connections.addConnection("#27");
  const network = await efrenSession.connections.listConnections();

  assert.equal(connection.id, "phone:#27");
  assert.equal(connection.phoneNumber, "#27");
  assert.equal(network.some((networkConnection) => networkConnection.id === "phone:#27"), true);
});

test("claimed phones replace manually added phone placeholders in the network", async () => {
  const storage = new MemoryJsonStorage();
  const efrenSession = createServices(storage);

  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");

  const phone27Session = createServices(storage);
  await phone27Session.users.resetLocalData();
  await phone27Session.users.updateIdentifiers({ tag: "", phoneNumber: "27" });
  await phone27Session.users.updateDisplayName("the27");

  const returningEfrenSession = createServices(storage);
  await returningEfrenSession.users.resetLocalData();
  await returningEfrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await returningEfrenSession.users.updateDisplayName("Efren");
  const network = await returningEfrenSession.connections.listConnections();

  assert.equal(network.some((connection) => connection.displayName === "the27"), true);
  assert.equal(network.some((connection) => connection.id === "phone:#27"), false);
});

test("updating display name updates the directory entry", async () => {
  const storage = new MemoryJsonStorage();
  const efrenSession = createServices(storage);

  const efren = await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.users.updateDisplayName("Efren Updated");
  const directoryUsers = await efrenSession.directory.listUsers();

  assert.equal(
    directoryUsers.some((directoryUser) => (
      directoryUser.id === efren.id &&
      directoryUser.displayName === "Efren Updated"
    )),
    true
  );
});

test("updating identifiers merges with existing directory identity instead of duplicating it", async () => {
  const storage = new MemoryJsonStorage();
  const firstSession = createServices(storage);

  const originalUser = await firstSession.users.updateIdentifiers({ tag: "the27", phoneNumber: "" });
  await firstSession.users.updateDisplayName("The 27");

  const secondSession = createServices(storage);
  await secondSession.users.resetLocalData();
  await secondSession.users.updateIdentifiers({ tag: "", phoneNumber: "27" });
  await secondSession.users.updateDisplayName("The 27 Phone");

  const returningFirstSession = createServices(storage);
  await returningFirstSession.users.resetLocalData();
  await returningFirstSession.users.updateIdentifiers({ tag: "the27", phoneNumber: "27" });
  await returningFirstSession.users.updateDisplayName("The 27 Merged");
  const directoryUsers = await returningFirstSession.directory.listUsers();
  const matchingUsers = directoryUsers.filter((directoryUser) => (
    directoryUser.id === originalUser.id ||
    directoryUser.tag === "@the27" ||
    directoryUser.phoneNumber === "#27"
  ));

  assert.equal(matchingUsers.length, 1);
  assert.equal(matchingUsers[0].displayName, "The 27 Merged");
  assert.equal(matchingUsers[0].tag, "@the27");
  assert.equal(matchingUsers[0].phoneNumber, "#27");
});

test("creating a huddle records a huddle-created activity", async () => {
  const storage = new MemoryJsonStorage();
  const efrenSession = createServices(storage);

  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Activity huddle",
    memberIds: ["phone:#27"]
  });
  const messages = await efrenSession.messages.listMessages(topic.id);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].kind, "system");
  assert.equal(messages[0].activityType, "huddle_created");
  assert.equal(messages[0].body, "Huddle created");
  assert.equal(typeof messages[0].createdAt, "string");
});

test("updating a huddle title records a title-updated activity", async () => {
  const storage = new MemoryJsonStorage();
  const efrenSession = createServices(storage);

  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Old title",
    memberIds: ["phone:#27"]
  });

  await efrenSession.topics.updateTopic(topic.id, {
    title: "New title",
    memberIds: ["phone:#27"]
  });
  const messages = await efrenSession.messages.listMessages(topic.id);
  const titleActivity = messages.find((message) => message.activityType === "title_updated");

  assert.equal(titleActivity?.kind, "system");
  assert.equal(titleActivity?.body, "Title updated from \"Old title\" to \"New title\"");
  assert.equal(typeof titleActivity?.createdAt, "string");
});

test("updating huddle members records member-added and member-removed activities", async () => {
  const storage = new MemoryJsonStorage();
  const efrenSession = createServices(storage);

  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Member activity",
    memberIds: ["phone:#27"]
  });

  const phone27Session = createServices(storage);
  await phone27Session.users.resetLocalData();
  await phone27Session.users.updateIdentifiers({ tag: "", phoneNumber: "27" });
  await phone27Session.users.updateDisplayName("The 27");

  const returningEfrenSession = createServices(storage);
  await returningEfrenSession.users.resetLocalData();
  await returningEfrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await returningEfrenSession.users.updateDisplayName("Efren");

  await returningEfrenSession.topics.updateTopic(topic.id, {
    title: "Member activity",
    memberIds: ["andre"]
  });
  const messages = await returningEfrenSession.messages.listMessages(topic.id);
  const addedActivity = messages.find((message) => message.activityType === "member_added");
  const removedActivity = messages.find((message) => message.activityType === "member_removed");

  assert.equal(addedActivity?.kind, "system");
  assert.equal(addedActivity?.body, "Member added: andre");
  assert.equal(removedActivity?.kind, "system");
  assert.equal(removedActivity?.body, "Member removed: The 27");
});

test("member activities display public identifiers when no directory name exists", async () => {
  const storage = new MemoryJsonStorage();
  const efrenSession = createServices(storage);

  await efrenSession.users.updateIdentifiers({ tag: "efren", phoneNumber: "" });
  await efrenSession.users.updateDisplayName("Efren");
  await efrenSession.connections.addConnection("#27");
  const topic = await efrenSession.topics.createTopic({
    title: "Identifier activity",
    memberIds: ["phone:#27"]
  });

  await efrenSession.topics.updateTopic(topic.id, {
    title: "Identifier activity",
    memberIds: ["andre"]
  });
  const messages = await efrenSession.messages.listMessages(topic.id);
  const removedActivity = messages.find((message) => message.activityType === "member_removed");

  assert.equal(removedActivity?.body, "Member removed: #27");
});

function createServices(storage: JsonStorage): ServiceSet {
  const directory = new LocalDirectoryUserService(storage);
  const users = new LocalUserService(storage, directory);
  const messages = new LocalMessageService(storage);
  const topics = new LocalTopicService(storage, users, directory, messages);
  const connections = new LocalConnectionService(storage, users, directory);

  return { connections, directory, messages, topics, users };
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
