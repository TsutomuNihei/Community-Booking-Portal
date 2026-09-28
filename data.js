/* Mock data layer. JSON-shaped records are persisted in this browser only. */
(function () {
  "use strict";

  const BOOKINGS_KEY = "coastlinkBookingsV1";
  const MAINTENANCE_KEY = "coastlinkMaintenanceV1";
  /* facility names and equipment for the form */
  const facilities = [
    { id: "harbour-hall", name: "Badminton Court", capacity: 120, type: "room" },
    { id: "seaside-meeting", name: "Seaside Meeting Room", capacity: 20, type: "room" },
    { id: "coastal-court", name: "Coastal Sports Court", capacity: 30, type: "room" },
    { id: "foreshore-pavilion", name: "Foreshore Pavilion", capacity: 50, type: "room" },
    {
      id: "equipment",
      name: "Equipment hire",
      capacity: 1,
      type: "equipment",
      options: ["Portable PA system", "Projector kit", "BBQ trailer", "Goal nets", "Line marker", "Folding tables", "XBOX X"]
    }
  ];

  const hirer = {
    accountId: "CL-HIRER-104",
    name: "Buzz Lightyear",
    organisation: "CoastLink Netball Club",
    email: "buzz.lightyear@example.com",
    phone: "0412 555 018"
  };

  const hirerAccounts = [
    {
      login: "6767C",
      password: "Nyanpasu",
      ...hirer
    },
    {
      login: "Dhomochevsky",
      password: "Safeguard",
      accountId: "Dhomochevsky",
      name: "Dhomochevsky",
      organisation: "CoastLink Community Hirer",
      email: "dhomochevsky@example.com",
      phone: "Not recorded"
    }
  ];

  function publicHirerDetails(account) {
    return {
      roomNumber: account.accountId,
      name: account.name,
      email: account.email,
      residence: account.organisation,
      phone: account.phone,
      organisation: account.organisation
    };
  }
  /* dummy data for the bookings */
  const seedBookings = [
    {
      id: "BK-10421",
      roomNumber: "CL-HIRER-104",
      residentName: "Buzz Lightyear",
      facilityId: "coastal-court",
      facilityName: "Coastal Sports Court",
      equipmentOption: "",
      date: "2026-09-18",
      startTime: "16:00",
      endTime: "18:00",
      status: "Confirmed"
    },
    {
      id: "BK-10408",
      roomNumber: "CL-HIRER-218",
      residentName: "Tung Tung Sahur",
      facilityId: "harbour-hall",
      facilityName: "Badminton Court",
      equipmentOption: "",
      date: "2026-09-20",
      startTime: "10:00",
      endTime: "12:00",
      status: "Confirmed"
    },
    {
      id: "BK-10390",
      roomNumber: "CL-HIRER-104",
      residentName: "Buzz Lightyear",
      facilityId: "equipment",
      facilityName: "Equipment hire",
      equipmentOption: "Portable PA system",
      date: "2026-09-12",
      startTime: "09:00",
      endTime: "13:00",
      status: "Cancelled"
    }
  ];
  /* read bookings from local storage */
  function readBookings() {
    const storedValue = localStorage.getItem(BOOKINGS_KEY);
    if (!storedValue) {
      saveBookings(seedBookings);
      return seedBookings.slice();
    }

    try {
      const bookings = JSON.parse(storedValue);
      if (!Array.isArray(bookings)) return seedBookings.slice();
      return bookings.map((booking) => {
        if (!booking.timeSlot || booking.startTime) return booking;
        const [startTime, endTime] = booking.timeSlot.split(" - ");
        return { ...booking, startTime, endTime };
      });
    } catch (error) {
      console.warn("Stored bookings could not be read.", error);
      return seedBookings.slice();
    }
  }

  function saveBookings(bookings) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }

  function readMaintenance() {
    try {
      const records = JSON.parse(localStorage.getItem(MAINTENANCE_KEY) || "[]");
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.warn("Stored maintenance could not be read.", error);
      return [];
    }
  }

  /* function to save maintenance records into local storage */
  function saveMaintenance(records) {
    localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(records));
  }
  /* convert date to local date string else cant be stored in local storage */
  function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  /* storing the dummy data in local */
  /* hardcoded credentials for the student and staff */
  window.PortalStore = {
    credentials: {
      students: hirerAccounts.map((account) => ({
        user: account.login,
        password: account.password
      })),
      staff: { user: "UOW rule rule", password: "password!" }
    },
    student: publicHirerDetails(hirerAccounts[0]),
    facilities,
    seedBookings,

    authenticateStudent(user, password) {
      const account = hirerAccounts.find((candidate) =>
        candidate.login.toUpperCase() === String(user).trim().toUpperCase() &&
        candidate.password === password
      );
      return account ? publicHirerDetails(account) : null;
    },

    getBookings: readBookings,
    getMaintenance: readMaintenance,

    /* function to add a booking into system, returns the booking after saving for user to view */
    addBooking(booking) {
      const bookings = readBookings();
      bookings.push(booking);
      saveBookings(bookings);
      return booking;
    },

    /* function to cancel a booking, returns true if successful, false if not successful */
    cancelBooking(id) {
      const bookings = readBookings();
      const booking = bookings.find((item) => item.id === id);
      if (!booking || booking.status === "Cancelled") return false;
      booking.status = "Cancelled";
      saveBookings(bookings);
      return true;
    },
    /* function to add maintenance records into system, returns the record after saving for admin to view */
    addMaintenance(record) {
      const records = readMaintenance();
      records.push(record);
      saveMaintenance(records);
      return record;
    },

    today: toLocalDateString
  };
})();
