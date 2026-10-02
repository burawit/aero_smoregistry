// Settings for the membership web form.
// Leave API_URL empty to run in demo mode (data is kept only in this browser).
window.APP_CONFIG = {
  // Apps Script web-app URL ending in /exec (Deploy → Manage deployments)
  API_URL: "https://script.google.com/macros/s/AKfycbyGZdj50fG2aR3EsJAouN0d-odn_U3gc94R8WxV37YsOHO2CVSXpwmVxpxAfvlCTbLn/exec",

  // Fees — keep in sync with FEES in apps-script/Code.gs
  MEMBER_FEE: 100,          // บาท/คน/ปี
  CARD_FEE: 20,             // บาท/คน
  CARD_FEE_ON_RENEW: false, // false = card fee only for "สมัครใหม่"

  MAX_MEMBERS: 3,

  // Printed on the staff section of the form
  ADDRESSEE: "ผศข.บภ 2.",
  DIRECTOR_TITLE: "ผู้อำนวยการศูนย์ควบคุมการบินเชียงใหม่",
  COMPANY_NAME: "บริษัท วิทยุการบินแห่งประเทศไทย จำกัด",

  // Suggestions shown while typing.
  // สังกัด list lives in departments.js and ตำแหน่ง in positions.js — leave these empty to use them.
  DEPARTMENTS: [],
  POSITIONS: [],
  RELATIONSHIPS: ["ญาติ", "บุคคลภายนอก"],
};
