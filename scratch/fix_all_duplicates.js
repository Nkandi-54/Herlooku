const fs = require('fs');
const path = require('path');

const root = 'c:/Users/FalamaS/Herlooku';

function cleanFile(relPath, transforms) {
  const fullPath = path.join(root, relPath);
  let content = fs.readFileSync(fullPath, 'utf8');
  // Normalize CRLF to LF for reliable regex/string replacement
  content = content.replace(/\r\n/g, '\n');
  
  for (const [target, replacement] of transforms) {
    if (typeof target === 'string') {
      if (!content.includes(target)) {
        console.warn(`[WARN] Target not found in ${relPath}: ${target.slice(0, 40)}...`);
      }
      content = content.split(target).join(replacement);
    } else if (target instanceof RegExp) {
      content = content.replace(target, replacement);
    }
  }

  // Restore Windows CRLF
  content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ Cleaned ${relPath}`);
}

// 1. admin/verifications/page.tsx
cleanFile('src/app/admin/verifications/page.tsx', [
  [
`import { User, Booking, EmergencyAlarm } from "@/types";
import { User, Booking, EmergencyAlarm, CONSTANT_HIRING_FEE_USD } from "@/types";`,
`import { User, Booking, EmergencyAlarm, CONSTANT_HIRING_FEE_USD } from "@/types";`
  ],
  [
`    .reduce((sum, b) => sum + (b.platformBookingFee || b.totalAmount || 15), 0);
    .reduce((sum, b) => sum + (b.platformBookingFee || b.totalAmount || CONSTANT_HIRING_FEE_USD), 0);`,
`    .reduce((sum, b) => sum + (b.platformBookingFee || b.totalAmount || CONSTANT_HIRING_FEE_USD), 0);`
  ]
]);

// 2. api/bookings/route.ts
cleanFile('src/app/api/bookings/route.ts', [
  [
`import { Booking } from "@/types";
import { Booking, CONSTANT_HIRING_FEE_USD } from "@/types";`,
`import { Booking, CONSTANT_HIRING_FEE_USD } from "@/types";`
  ],
  [
`    const workerBookings = db.getBookingsForWorker(activeUser.id);
    const workerBookings = db.getBookingsForWorker(activeUser.id).map((b) => {`,
`    const workerBookings = db.getBookingsForWorker(activeUser.id).map((b) => {`
  ],
  [
`    const platformBookingFee = 15; // standard fee directly to web owner
    const platformBookingFee = CONSTANT_HIRING_FEE_USD; // Constant Ksh 3,000 paid to web owner
    const workerExpectedDailySalary = workerProfile.expectedDailySalary || 8;
    const totalAmount = platformBookingFee; // Website only charges the booking fee
    const totalAmount = platformBookingFee; // Website only charges the constant hiring fee`,
`    const platformBookingFee = CONSTANT_HIRING_FEE_USD; // Constant Ksh 3,000 paid to web owner
    const workerExpectedDailySalary = workerProfile.expectedDailySalary || 8;
    const totalAmount = platformBookingFee; // Website only charges the constant hiring fee`
  ]
]);

// 3. api/profile/route.ts
cleanFile('src/app/api/profile/route.ts', [
  [
`  const workerProfile =
  let workerProfile =`,
`  let workerProfile =`
  ]
]);

// 4. booking/[workerId]/page.tsx
cleanFile('src/app/booking/[workerId]/page.tsx', [
  [
`import { WorkerProfile, User, Booking } from "@/types";
import { WorkerProfile, User, Booking, CONSTANT_HIRING_FEE_USD } from "@/types";`,
`import { WorkerProfile, User, Booking, CONSTANT_HIRING_FEE_USD } from "@/types";`
  ],
  [
`  const platformBookingFee = 15; // base USD
  // Pricing: Platform hiring fee paid directly to web owner (Constant 3,000 Ksh / $23.08)
  const platformBookingFee = CONSTANT_HIRING_FEE_USD;
  const workerExpectedDailySalary = workerData.expectedDailySalary || 8;
  const totalAmount = platformBookingFee; // Only booking fee charged online
  const totalAmount = platformBookingFee; // Only constant hiring fee charged online`,
`  // Pricing: Platform hiring fee paid directly to web owner (Constant 3,000 Ksh / $23.08)
  const platformBookingFee = CONSTANT_HIRING_FEE_USD;
  const workerExpectedDailySalary = workerData.expectedDailySalary || 8;
  const totalAmount = platformBookingFee; // Only constant hiring fee charged online`
  ]
]);

// 5. dashboard/client/page.tsx
cleanFile('src/app/dashboard/client/page.tsx', [
  [
`import { User, Booking, WorkerProfile } from "@/types";
import { User, Booking, WorkerProfile, CONSTANT_HIRING_FEE_USD } from "@/types";`,
`import { User, Booking, WorkerProfile, CONSTANT_HIRING_FEE_USD } from "@/types";`
  ]
]);

// 6. dashboard/worker/layout.tsx
cleanFile('src/app/dashboard/worker/layout.tsx', [
  [
`      label: "Edit Profile & Hire Fee",
      label: "Edit Profile & Daily Pay",`,
`      label: "Edit Profile & Daily Pay",`
  ]
]);

// 7. page.tsx
cleanFile('src/app/page.tsx', [
  [
`import { WorkerProfile, User } from "@/types";
import { WorkerProfile, User, CONSTANT_HIRING_FEE_USD } from "@/types";`,
`import { WorkerProfile, User, CONSTANT_HIRING_FEE_USD } from "@/types";`
  ],
  [
`              {/* Card Footer with Price and Exclusive Booking button */}
              {/* Card Footer with Constant Hiring Fee & Daily Pay and Exclusive Booking button */}
              <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    Exclusive Hire Fee
                    Hiring Fee
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-slate-900">
                      {formatPrice(wp.hireFee)}
                    <span className="text-base font-black text-slate-900">
                      {formatPrice(CONSTANT_HIRING_FEE_USD)}
                    </span>
                    <span className="text-[11px] text-slate-500">/hire</span>
                    <span className="text-[10px] text-slate-500">one-time</span>
                  </div>`,
`              {/* Card Footer with Constant Hiring Fee & Daily Pay and Exclusive Booking button */}
              <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    Hiring Fee
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-slate-900">
                      {formatPrice(CONSTANT_HIRING_FEE_USD)}
                    </span>
                    <span className="text-[10px] text-slate-500">one-time</span>
                  </div>`
  ]
]);

// 8. workers/[id]/page.tsx
cleanFile('src/app/workers/[id]/page.tsx', [
  [
`import { WorkerProfile, User, Review } from "@/types";
import { WorkerProfile, User, Review, CONSTANT_HIRING_FEE_USD } from "@/types";`,
`import { WorkerProfile, User, Review, CONSTANT_HIRING_FEE_USD } from "@/types";`
  ],
  [
`  const platformBookingFee = 15; // base USD ($15 = Ksh 1,950)
  // CONSTANT PLATFORM HIRING FEE MODEL:
  const platformBookingFee = CONSTANT_HIRING_FEE_USD; // Constant Ksh 3,000 for all workers
  const workerExpectedDailySalary = profile.expectedDailySalary || 8;
  const totalAmount = platformBookingFee; // Website only charges the booking fee
  const totalAmount = platformBookingFee; // Website only charges the constant hiring fee`,
`  // CONSTANT PLATFORM HIRING FEE MODEL:
  const platformBookingFee = CONSTANT_HIRING_FEE_USD; // Constant Ksh 3,000 for all workers
  const workerExpectedDailySalary = profile.expectedDailySalary || 8;
  const totalAmount = platformBookingFee; // Website only charges the constant hiring fee`
  ]
]);

console.log('All files fixed with precision!');

