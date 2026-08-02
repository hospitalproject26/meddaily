export interface RegularMedicine {
  name: string;
  qtyDispensed: number; // total units given, e.g. 60 tablets
  dosesPerDay: number; // e.g. 1 tablet/day
  dispensedOn: string; // ISO date string, e.g. "2026-06-07"
}

export interface RefillStatus {
  daysSupply: number;
  expectedFinishDate: Date;
  daysRemaining: number; // negative once already finished
  dueSoon: boolean; // true when 0-5 days of supply are left
}

/**
 * Given a regular customer's dispensed medicine, works out how many days
 * of supply they had, and whether they are within the next 5 days of
 * running out (so the pharmacist should be reminded to follow up).
 */
export function getRefillStatus(
  medicine: RegularMedicine,
  today: Date = new Date()
): RefillStatus {
  const daysSupply = Math.floor(medicine.qtyDispensed / medicine.dosesPerDay);

  const start = new Date(medicine.dispensedOn);
  const expectedFinishDate = new Date(start);
  expectedFinishDate.setDate(expectedFinishDate.getDate() + daysSupply);

  const msPerDay = 24 * 60 * 60 * 1000;
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const finishMidnight = new Date(
    expectedFinishDate.getFullYear(),
    expectedFinishDate.getMonth(),
    expectedFinishDate.getDate()
  );

  const daysRemaining = Math.round((finishMidnight.getTime() - todayMidnight.getTime()) / msPerDay);

  return {
    daysSupply,
    expectedFinishDate,
    daysRemaining,
    dueSoon: daysRemaining >= 0 && daysRemaining <= 5,
  };
}
