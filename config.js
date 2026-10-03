// Settings for the membership web form.
// Leave API_URL empty to run in demo mode (data is kept only in this browser).
window.APP_CONFIG = {
  // Apps Script web-app URL ending in /exec (Deploy → Manage deployments)
  API_URL: "https://script.google.com/macros/s/AKfycbyGZdj50fG2aR3EsJAouN0d-odn_U3gc94R8WxV37YsOHO2CVSXpwmVxpxAfvlCTbLn/exec",

  // Fees — keep in sync with FEES in apps-script/Code.gs
  MEMBER_FEE: 100,          // บาท/คน/ปี
  CARD_FEE: 20,             // บาท/คน
  CARD_FEE_ON_RENEW: true,  // ประกาศ ข้อ ๑๖: ค่าจัดทำบัตร 20 บาท/คน/ปี → ต่ออายุก็เสีย

  MAX_MEMBERS: 12,          // rows on the form: ครอบครัว 1–9 + บุคคลภายนอก 10–12 (keep in sync with Code.gs)

  // ปีสมาชิก = ปีงบประมาณ 1 ต.ค.–30 ก.ย. → บัตรหมดอายุ 30 ก.ย. (1 = ปีปฏิทิน). Keep in sync with MEMBERSHIP_YEAR in Code.gs
  MEMBERSHIP_YEAR_START_MONTH: 10,

  // บัตรสมาชิก (optional)
  CARD_LOGO: "images/logo-seal.svg",       // ตราบริษัทที่หัวบัตร (โลโก้เต็ม: images/logo-aerothai.svg)
  // CARD_CONTACT: "โทร 0 5320 0000",        // ด้านหลังบัตร ต่อท้าย "หากพบบัตรนี้ โปรดส่งคืน…"

  // Printed on the staff section of the form
  ADDRESSEE: "ผศช.บภ 2.",
  DIRECTOR_TITLE: "ผู้อำนวยการศูนย์ควบคุมการบินเชียงใหม่",
  COMPANY_NAME: "บริษัท วิทยุการบินแห่งประเทศไทย จำกัด",

  // Suggestions shown while typing.
  // สังกัด list lives in departments.js and ตำแหน่ง in positions.js — leave these empty to use them.
  DEPARTMENTS: [],
  POSITIONS: [],
  RELATIONSHIPS: ["คู่สมรส", "บุตร", "บิดา", "มารดา", "พี่น้อง", "ญาติ"],
};
