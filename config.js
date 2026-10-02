// Settings for the membership web form.
// Leave API_URL empty to run in demo mode (data is kept only in this browser).
window.APP_CONFIG = {
  // Apps Script web-app URL ending in /exec (Deploy → Manage deployments)
  API_URL: "",

  // Fees — keep in sync with FEES in apps-script/Code.gs
  MEMBER_FEE: 100,          // บาท/คน/ปี
  CARD_FEE: 20,             // บาท/คน
  CARD_FEE_ON_RENEW: false, // false = card fee only for "สมัครใหม่"

  MAX_MEMBERS: 6,

  // Printed on the staff section of the form
  ADDRESSEE: "ผศข.บภ 2.",
  DIRECTOR_TITLE: "ผู้อำนวยการศูนย์ควบคุมการบินเชียงใหม่",
  COMPANY_NAME: "บริษัท วิทยุการบินแห่งประเทศไทย จำกัด",

  // Suggestions shown while typing (optional)
  DEPARTMENTS: [],
  RELATIONSHIPS: ["ตนเอง", "คู่สมรส", "บุตร", "บิดา", "มารดา", "พี่น้อง", "ญาติ"],
};
