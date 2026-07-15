import { connectionService } from "@/services/connectionService";
import { localJsonStorage } from "@/services/localJsonStorage";
import { messageService } from "@/services/messageService";
import { topicService } from "@/services/topicService";
import { userService } from "@/services/userService";

const appStorageNamespace = "huddle:";

export async function clearLocalAppData() {
  await localJsonStorage.clearNamespace(appStorageNamespace);
  await Promise.all([
    connectionService.resetLocalData(),
    messageService.resetLocalData(),
    topicService.resetLocalData(),
    userService.resetLocalData()
  ]);
}

export async function logOutLocalUser() {
  await Promise.all([
    connectionService.resetLocalData(),
    userService.resetLocalData()
  ]);
}
