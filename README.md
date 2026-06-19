# Personal Life Hub — Frontend

เว็บแอปจัดการชีวิตส่วนตัว สร้างด้วย **Angular 20** (standalone components + signals)
เป็นส่วนหน้า (frontend) ที่เรียกใช้ REST API จากโปรเจกต์ backend ที่ `../Nodejs`

---

## ฟีเจอร์

| หน้า | เส้นทาง | รายละเอียด |
|------|---------|------------|
| เข้าสู่ระบบ / สมัครสมาชิก | `/login`, `/register` | JWT auth |
| แดชบอร์ด | `/dashboard` | รวมทางลัดไปทุกฟีเจอร์ + จำนวนงานค้าง |
| งานที่ต้องทำ | `/todos` | CRUD to-do + ความสำคัญ (low/medium/high) |
| ปฏิทิน | `/events` | CRUD กิจกรรม + **มุมมองปฏิทินรายเดือน** และมุมมองรายการ |
| บันทึก | `/notes` | CRUD โน้ต + แท็ก |
| เป้าหมาย | `/goals` | CRUD เป้าหมาย + แถบความคืบหน้า (0–100%) |
| การเงิน | `/transactions` | บันทึกรายรับ-รายจ่าย + สรุปยอดคงเหลือ |
| การแจ้งเตือน | `/reminders` | ตั้งเตือนงาน/กิจกรรม/เป้าหมาย + สถานะแจ้งแล้ว |

---

## เทคโนโลยีและสถาปัตยกรรม

- **Angular 20** — standalone components (ไม่มี NgModule), lazy-loaded routes
- **Signals** — จัดการ state ในคอมโพเนนต์ (`signal`, `computed`)
- **Reactive Forms** — ทุกฟอร์ม
- **RxJS** — เรียก API ผ่าน `HttpClient`

```
src/app/
├── app.routes.ts              # นิยาม route ทั้งหมด (lazy loadComponent + guards)
├── app.config.ts              # providers (router, HttpClient + interceptor)
├── core/
│   ├── guards/                # authGuard (ต้องล็อกอิน), guestGuard (เฉพาะยังไม่ล็อกอิน)
│   ├── interceptors/          # auth.interceptor — แนบ Bearer token ทุก request
│   └── services/              # auth, todo, event, note, goal, transaction, reminder
└── features/                  # หนึ่งโฟลเดอร์ต่อหนึ่งฟีเจอร์ (component .ts/.html/.scss)
```

**รูปแบบของแต่ละฟีเจอร์:** `core/services/<x>.service.ts` (เรียก API) + `features/<x>/<x>.component.{ts,html,scss}` (UI) + route ใน `app.routes.ts` ที่ป้องกันด้วย `authGuard`

---

## การติดตั้งและรัน

### ข้อกำหนดเบื้องต้น
ต้องรัน **backend API** ที่ `../Nodejs` ไว้ก่อน (ค่าเริ่มต้นที่ `http://localhost:5000`)
ดูวิธีตั้งค่าใน `../Nodejs/README.md`

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. รัน dev server
```bash
npm start          # หรือ: ng serve
```
เปิดเบราว์เซอร์ที่ `http://localhost:4200/`

> request ที่ขึ้นต้นด้วย `/api` จะถูก proxy ไปที่ `http://localhost:5000` โดยอัตโนมัติ
> (ตั้งค่าไว้ใน `proxy.conf.json` และผูกไว้ใน `angular.json`)

### 3. Build สำหรับ production
```bash
npm run build      # ผลลัพธ์อยู่ใน dist/
```

---

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำ |
|--------|-------|
| `npm start` | รัน dev server (พร้อม proxy ไป backend) |
| `npm run build` | build production |
| `npm run watch` | build แบบ development + watch |
| `npm test` | รัน unit test (Karma + Jasmine) |

> แนะนำให้ตรวจความถูกต้องของ template ด้วย `ng build --configuration development`
> เพราะ `tsc` เปล่า ๆ จะไม่ตรวจ error ในไฟล์ `.html`

---

## การเชื่อมต่อกับ Backend

- ทุก service เรียก API ด้วย path สัมพัทธ์ `'/api/...'` (อาศัย proxy ตอน dev)
- `auth.interceptor` แนบ `Authorization: Bearer <token>` ให้ทุก request อัตโนมัติ
- token เก็บไว้ฝั่ง client หลัง login และใช้โดย `authGuard` เพื่อกันหน้าที่ต้องล็อกอิน
- ทุก response มีรูปแบบ `{ success, message?, data }` ตรงกับฝั่ง backend

---

## การเพิ่มฟีเจอร์ใหม่

1. สร้าง service ใน `core/services/` (เมธอด `getAll/create/update/remove`)
2. สร้างคอมโพเนนต์ใน `features/<ชื่อ>/`
3. เพิ่ม route แบบ lazy ใน `app.routes.ts` พร้อม `canActivate: [authGuard]`
4. เพิ่มการ์ดใน `features/dashboard/dashboard.component.ts` (อาเรย์ `features`) และตั้ง `available: true`
