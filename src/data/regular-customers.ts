import type { RegularMedicine } from "@/lib/refill-tracker";

export interface Customer {
  id: number;
  name: string;
  phone: string;
  visits: number;
  lastOrder: string;
  regularMedicine?: RegularMedicine;
}

export const regularCustomers: Array<Customer> = [
  {
    id: 1,
    name: "Rahul Sharma",
    phone: "+91 98765 43210",
    visits: 12,
    lastOrder: "2026-07-28",
    // 60 tablets, 1/day, dispensed 2026-06-07 -> 5 days of supply left today
    regularMedicine: {
      name: "Metformin 500mg",
      qtyDispensed: 60,
      dosesPerDay: 1,
      dispensedOn: "2026-06-07",
    },
  },
  {
    id: 2,
    name: "Anita Desai",
    phone: "+91 91234 56789",
    visits: 8,
    lastOrder: "2026-07-25",
  },
  {
    id: 3,
    name: "Vijay Patil",
    phone: "+91 99887 76655",
    visits: 3,
    lastOrder: "2026-07-20",
    // 30 tablets, 1/day, dispensed 2026-07-10 -> not due for a while yet
    regularMedicine: {
      name: "Atorvastatin 10mg",
      qtyDispensed: 30,
      dosesPerDay: 1,
      dispensedOn: "2026-07-10",
    },
  },
];
