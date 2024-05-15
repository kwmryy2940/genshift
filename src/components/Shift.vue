<template>
  <v-sheet>
    <FullCalendar
      :options="calendarOptions"
      @dateClick="handleDateClick"
      @eventClick="handleEventClick"
    />
  </v-sheet>
  <v-progress-linear
    v-if="loading"
    absolute
    bottom
    indeterminate
    color="primary"
  ></v-progress-linear>
  <v-container>
    <v-btn color="primary" class="ma-1" @click="handleGenerateShiftClick"
      >シフト生成</v-btn
    >
    <v-btn color="secondary" class="ma-1" @click="clearShift(false)"
      >シフトをクリア</v-btn
    >
    <v-spacer></v-spacer>
    <v-btn color="red" class="ma-1" @click="clearShift(true)"
      >シフト・当直クリア</v-btn
    >
    <v-btn color="purple" class="ma-1" @click="memberDialog = true"
      >担当者設定</v-btn
    >
  </v-container>
  <v-dialog v-model="dialog">
    <v-sheet>
      <v-card title="当直設定">
        <v-card-text>
          <v-text-field
            variant="outlined"
            label="当直日"
            type="date"
            v-model="assignedDate"
            readonly
          >
          </v-text-field>
          <v-select
            variant="outlined"
            v-model="assignedMember"
            label="担当者"
            :items="members"
            item-title="title"
            item-value="title"
            return-value
          >
          </v-select>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="handleAssignMember">OK</v-btn>
          <v-btn color="primary" @click="dialog = false">キャンセル</v-btn>
        </v-card-actions>
      </v-card>
    </v-sheet>
  </v-dialog>

  <v-dialog v-model="memberDialog">
    <v-sheet>
      <v-card>
        <v-card-title>担当者設定</v-card-title>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th class="text-left">担当者名</th>
                <th class="text-left">削除</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in members" :key="item.title">
                <td>
                  <v-btn
                    variant="text"
                    style="text-decoration: underline; text-transform: none"
                    color="primary"
                    @click="handleEditMemberClick"
                    >{{ item.title }}</v-btn
                  >
                </td>
                <td>
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    color="red"
                    @click="deleteMember(item.title)"
                  ></v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-text
          ><v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="handleAddMemberClick"
            >担当者追加</v-btn
          ></v-card-text
        >
        <v-card-actions>
          <v-btn color="primary" @click="memberDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-sheet>
  </v-dialog>
  <v-dialog v-model="editDialog">
    <v-sheet>
      <v-card>
        <v-card-title>担当者編集画面</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="selectedMember"
            variant="outlined"
            :readonly="isEdit === true ? true : false"
          ></v-text-field>
          <v-select
            variant="outlined"
            v-model="selectedDates"
            :label="'非番の日付を選択'"
            :items="dayList"
            multiple
            hint=""
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="editMember">登録</v-btn>
          <v-btn color="primary" @click="editDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-sheet>
  </v-dialog>
  <!-- <v-btn
    fab
    absolute
    style="right: 10px; bottom: 10px; position: fixed"
    icon="mdi-information-outline"
    variant="text"
  >
  </v-btn> -->
  <v-img style="width: 25%; right: 3px; bottom: 25px; position: fixed;" :height="150" :src="topImg"></v-img>
</template>

<script setup>
import { onMounted, ref } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import imageSource from "/top.png";

const topImg = imageSource;
// import { useUserStore } from "../store/users.js";

function handleDateClick(info) {
  // クリックした日に当直or当番が割り当て済みかをチェック
  if (calendarOptions.value.events.length > 0) {
    const filterdEvents = calendarOptions.value.events.filter((event) => {
      return event.start === info.dateStr;
    });
    // クリックした日付が平日の場合、割り当て済みの日付は当直入力をできないようにする
    if (!isWeekend(info.date) && filterdEvents.length > 0) return;
    // クリックした日付が土日の場合、3人以上割り当てられないようにする
    if (isWeekend(info.date) && filterdEvents.length >= 2) return;
  }

  dialog.value = true;
  assignedDate.value = info.dateStr;
  let calendarApi = info.view.calendar;
  calendarApi.unselect();
}

const handleEventClick = (e) => {
  // contentText.value = e.event._def.title;
  // contentDate.value = e.event._instance.range.start;
  // contentDialog.value = true;
};

// メンバー追加ボタンクリック時の処理
const handleAddMemberClick = (e) => {
  // members.value.push({ title: "", count: 0, color: "" });
  selectedMember.value = "";
  selectedDates.value = [];
  isEdit.value = false;
  editDialog.value = true;
};

// メンバー編集ボタンクリック時の処理
const handleEditMemberClick = (e) => {
  selectedMember.value = e.srcElement.innerText;
  selectedDates.value = [];

  const index = members.value.findIndex(
    (member) => member.title === selectedMember.value
  );

  const today = new Date();
  const month = today.getMonth() + 1;

  members.value[index].excludeDates.forEach((date) => {
    const dateString =
      month.toString().padStart(2, "0") +
      "/" +
      date.toString().padStart(2, "0");

    selectedDates.value.push(dateString);
  });

  selectedDates.value.sort();
  console.log("selectedDates.value:", selectedDates.value);

  // if (selectedMember.value.length > 0) isEdit.value = true;
  // else isEdit.value = false;

  isEdit.value = true;
  editDialog.value = true;
};

// シフト生成ボタンクリック時の処理
const handleGenerateShiftClick = async (e) => {
  if (members.value.length < 4) {
    alert("担当者は最低4人登録してシフトを生成してください");
    return;
  }

  loading.value = true;

  await sleep(100);

  console.log("Generate shift started.");

  generateShift();

  console.log("Generate shift completed.");

  loading.value = false;
};

// const usersStore = useUserStore();

const calendarOptions = ref({
  locale: "ja",
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  headerToolbar: {
    start: "title",
    center: "",
    // end: "dayGridMonth,dayGridWeek,dayGridDay prev,next",
    end: "prev,next",
  },
  buttonText: {
    // today: "今日",
    month: "月",
    week: "週",
    day: "日",
  },
  events: [],
  selectable: true,
  selectMirror: true,
  // eventDisplay: "list-item",
  height: "80vh",
  // 日付クリック時の処理
  dateClick: handleDateClick,
  // eventクリック時の処理
  eventClick: handleEventClick,
  // 日付表記を変更する処理
  dayCellContent: function (e) {
    e.dayNumberText = e.dayNumberText.replace(/日$/, "");
    return e.dayNumberText;
  },
});

const shift = ref([]);
const dialog = ref(false);
const assignedDate = ref(null);
const assignedMember = ref(null);
const memberDialog = ref(false);
const prevPicks = ref([]);
const nextPicks = ref([]);
const loading = ref(false);

const editDialog = ref(false);
const isEdit = ref(false);
const dayList = ref([]);
const selectedMember = ref(null);
const selectedDates = ref([]);

const colorList = ref([
  "#F44336",
  "#673AB7",
  "#2196F3",
  "#4CAF50",
  "#CDDC39",
  "#FF9800",
  "#607D8B",
  "#795548",
  "#9C27B0",
  "#F48FB1",
]);

// メンバー、出勤回数
// const members = ref([
//   { title: "田中", count: 0, color: "#F44336", excludeDates: [] },
//   { title: "鈴木", count: 0, color: "#673AB7", excludeDates: [] },
//   { title: "佐藤", count: 0, color: "#2196F3", excludeDates: [] },
//   { title: "加藤", count: 0, color: "#4CAF50", excludeDates: [] },
//   { title: "高橋", count: 0, color: "#CDDC39", excludeDates: [] },
//   { title: "木村", count: 0, color: "#FF9800", excludeDates: [] },
//   { title: "渡辺", count: 0, color: "#607D8B", excludeDates: [] },
//   { title: "小林", count: 0, color: "#795548", excludeDates: [] },
//   { title: "安藤", count: 0, color: "#9C27B0", excludeDates: [] },
//   { title: "藤井", count: 0, color: "#F48FB1", excludeDates: [] },
// ]);

const members = ref([]);

// // 各メンバーの除外日を設定
// const excludedDates = ref([
//   { title: "田中", dates: [1, 15] }, // 田中は1日と15日を除外
//   { title: "鈴木", dates: [10] }, // 鈴木は10日を除外
//   // 他のメンバーの除外日を追加する場合はここに記述
// ]);

// 今月分の日付のリストを作成する
function getMonthDays() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dates = [];

  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month, day));
  }
  return dates;
}

// 週末判定
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isExcludedDate = (member, date) => {
  const excludedIndex = members.value.findIndex(
    (item) => item.title === member.title
  );

  if (excludedIndex === -1) return false;

  const filterdExcludedDates = members.value[excludedIndex].excludeDates;

  if (filterdExcludedDates.length <= 0) return false;
  const day = date.getDate();
  const result = filterdExcludedDates.includes(day);

  return result;
};

// 出勤回数が最小のメンバーを検索
const getMemberMinWorkCount = () => {
  const minCount = Math.min(...members.value.map((member) => member.count));
  const membersWithMinCount = members.value.filter(
    (member) => member.count === minCount
  );
  return membersWithMinCount;
};

function formartDate(date) {
  const formattedDate = date
    .toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
  return formattedDate;
}

function calcDate(date, plus) {
  let calculateDate = structuredClone(date);
  calculateDate.setDate(calculateDate.getDate() + plus);
  return formartDate(calculateDate);
}

function getEventsOnDate(events, date) {
  const filterdEvents = events.filter((event) => event.start === date);
  return filterdEvents;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// シフト生成
async function generateShift() {
  // 割り当て済みのイベント（当直）
  let assignedEvents = calendarOptions.value.events.filter(
    (event) => event.isOnShift === true
  );

  // シフトイベントのバッファをクリア
  shift.value = [];

  // カレンダーイベントをクリア
  calendarOptions.value.events = [];

  // 今月分の日付を配列で取得
  const dates = getMonthDays();

  // ループ開始
  dates.forEach((date) => {
    // 既に割当たっている場合はスキップ
    const nowEvents = getEventsOnDate(assignedEvents, formartDate(date));
    if (nowEvents.length > 0) {
      prevPicks.value = nowEvents;
      return;
    }
    // console.log("generateShift-1");
    // dateの翌日の日付を取得
    const tomorrow = calcDate(date, 1);

    // 次の日に割り当たっているイベントを取得
    nextPicks.value = getEventsOnDate(assignedEvents, tomorrow);
    // console.log("generateShift-2");

    const requiredPicks = isWeekend(date) ? 2 : 1; // 週末の場合は2人割り当てる

    // 出勤回数が少ないメンバーを抽出
    let filterdMembers = getMemberMinWorkCount();
    if (filterdMembers.length <= 1) {
      filterdMembers = members.value;
    }

    // console.log("generateShift-3");

    let newPicks = [];

    for (let i = 0; i < requiredPicks; i++) {
      let isPickFound = false; // 割り当て完了フラグ
      let pickCount = 0; // 抽出を実施した回数
      // 割り当てが終わるまで選出を繰り返す
      while (!isPickFound) {
        // 50回抽出しても選出が終わらない場合は選出元のメンバーリストをリセット
        if (pickCount === 50) {
          filterdMembers = members.value;
          pickCount = 0;
        }
        // メンバーの中からランダムにピックアップ
        const index = Math.floor(Math.random() * filterdMembers.length);
        const newPick = filterdMembers[index];
        pickCount++;
        // console.log("filterdMembers:",filterdMembers);
        // console.log("newPick:",newPick);
        /*
        以下の条件に沿って当番に割り当てるメンバーを選出する
          ・出勤回数が少ないメンバー
          ・前日の当番、当直に割当たっていないメンバー
          ・翌日の当番、当直に割当たっていないメンバー
          ・現在の日付を出勤不可としていないメンバー
         */
        if (
          !newPicks.includes(newPick) &&
          !nextPicks.value.some((item) => item.title === newPick.title) &&
          !prevPicks.value.some((item) => item.title === newPick.title) &&
          !isExcludedDate(newPick, date)
        ) {
          isPickFound = true;
          const memberIndex = members.value.findIndex(
            (member) => member.title === newPick.title
          );
          // 出勤回数をインクリメント
          members.value[memberIndex].count++;
          newPicks.push(newPick);
          filterdMembers = getMemberMinWorkCount();
          // console.log("generateShift-3b");
        }
        // console.log("generateShift-3c");
      }
    }
    // console.log("generateShift-4");

    // 選出したメンバーを保存
    prevPicks.value = newPicks;

    // カレンダーイベントに保存
    newPicks.forEach((pick) => {
      const event = {
        title: pick.title,
        start: formartDate(date),
        color: pick.color,
        isOnShift: false, // 当直の有無
      };
      // calendarOptions.value.events.push(event);
      assignedEvents.push(event);
    });
    // console.log("generateShift-5");
  });

  // カレンダーイベントに一括反映
  calendarOptions.value.events = assignedEvents;
  // 変数初期化
  prevPicks.value = [];
  nextPicks.value = [];
  members.value.forEach((member) => {
    member.count = 0;
  });
}

function clearShift(isAllClear) {
  shift.value = [];

  if (isAllClear) {
    calendarOptions.value.events = [];
  } else {
    const filterdEvents = getNormalShiftEvents();
    removeSpecifiedEvents(filterdEvents);
  }
}

// 当番のイベントを抽出する
function getNormalShiftEvents() {
  const filterdEvents = calendarOptions.value.events.filter(
    (event) => event.isOnShift === false
  );
  return filterdEvents;
}
// 指定したイベントをカレンダーイベントから削除
function removeSpecifiedEvents(specifiedEvents) {
  specifiedEvents.forEach((specifiedEvent) => {
    const eventIndex = calendarOptions.value.events.findIndex(
      (event) => event === specifiedEvent
    );
    calendarOptions.value.events.splice(eventIndex, 1);
  });
}

// メンバー情報を編集
function editMember() {
  let dateList = [];

  selectedDates.value.forEach((date) => {
    dateList.push(Number(date.substring(3)));
  });

  // const constraints = { title: selectedMember.value, dates: dateList };

  const color = colorList.value.shift();

  // 新規追加
  if (!isEdit.value) {
    const member = {
      title: selectedMember.value,
      count: 0,
      color: color,
      excludeDates: dateList,
    };

    members.value.push(member);
  }
  // 編集
  else {
    const index = members.value.findIndex(
      (item) => item.title === selectedMember.value
    );

    members.value[index].excludeDates = dateList;
  }

  selectedDates.value = [];
  selectedMember.value = null;
  editDialog.value = false;
}

function deleteMember(tagertMember) {
  if (members.value.length === 4) {
    alert(`担当者を${members.value.length}人未満にすることはできません`);
    return;
  }

  const memberIndex = members.value.findIndex(
    (member) => member.title === tagertMember
  );

  colorList.value.push(members.value[memberIndex].color);
  members.value.splice(memberIndex, 1);
}

// 担当者を当直に割り当てる
function handleAssignMember() {
  if (assignedMember.value === null || assignedMember.value.length <= 0) {
    alert("担当者を選択してください");
    return;
  }

  const eventIndex = calendarOptions.value.events.findIndex(
    (event) => event.start === assignedDate.value
  );

  if (
    eventIndex !== -1 &&
    calendarOptions.value.events[eventIndex].title === assignedMember.value
  ) {
    alert("既に割り当て済みの担当者です");
    return;
  }

  const memberIndex = members.value.findIndex(
    (member) => member.title === assignedMember.value
  );
  const event = {
    title: members.value[memberIndex].title,
    start: assignedDate.value,
    color: members.value[memberIndex].color,
    isOnShift: true, // 当直の有無
  };
  members.value[memberIndex].count++;
  calendarOptions.value.events.push(event);

  assignedMember.value = "";
  dialog.value = false;
}

onMounted(() => {
  const dates = getMonthDays();

  dates.forEach((date) => {
    dayList.value.push(formartDate(date).substring(5, 10).replace(/\-/g, "/"));
  });
});
</script>

<style>
.fc-day-sat {
  color: blue;
}

.fc-day-sun {
  color: red;
}
.fc .fc-scrollgrid {
  border-width: 0 0 0 0;
  font-weight: normal;
}

.fc .fc-daygrid-day-top {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.fc .fc-bg-event {
  opacity: 1;
}
</style>
