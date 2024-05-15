import { defineStore } from "pinia";

export const useUserStore = defineStore("users", {
  state: () => ({
    // ユーザーを保持する状態
    usersInfo: [],
  }),
  actions: {
    // ユーザーを追加するアクション
    setUsersInfo(usersInfo) {
      this.usersInfo.push(usersInfo);
    },
    // ユーザーを取得するアクション
    getContentsInfo() {
      return this.usersInfo;
    },
    // ユーザーを更新するアクション
    updateContentsInfo(userName, dstUsersInfo) {
      const index = this.usersInfo.findIndex((user) => user.name === userName);
      if (index === -1) return -1;
      this.contentsInfo.splice(index, 1, dstUsersInfo);
      return 0;
    },
    // ユーザーを削除するアクション
    removeContentsInfo(userName) {
      const index = this.usersInfo.findIndex((user) => user.name === userName);
      this.usersInfo.splice(index, 1);
    },
  },

  persist: {
    storage: localStorage,
  },
});
