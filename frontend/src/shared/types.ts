export type WeekdayCode = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type CalendarStatus = "AVAILABLE" | ReservationStatus;

export interface Vehicle {
  id: number;
  vehicle_name: string;
  available_weekdays: WeekdayCode[];
  active: boolean;
}

export interface CalendarEntry {
  vehicleId: number;
  rentalDate: string;
  status: ReservationStatus;
}

export interface ReservationSummary {
  reservationNumber: string;
  vehicleId: number;
  rentalDate: string;
  name: string;
  department: string;
  phone: string;
  destination?: string | null;
  purpose?: string | null;
  status: ReservationStatus;
}

export interface AdminReservation {
  id: number;
  reservation_number: string;
  vehicle_id: number;
  vehicle_name: string;
  rental_date: string;
  name: string;
  department: string;
  phone: string;
  destination: string | null;
  purpose: string | null;
  status: ReservationStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
}
