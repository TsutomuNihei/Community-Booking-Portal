/* Login, navigation, booking, and browser-side persistence logic. */
(function () {
  "use strict";

  const store = window.PortalStore;
  let currentUser = store.student;
  const hours = Array.from({ length: 15 }, (_, index) => index + 8);
  const viewIds = ["login-view", "staff-login-view", "student-portal", "staff-portal"];
  /* elements for the form */
  const elements = {
    staffLoginLink: document.querySelector("#staff-login-link"),
    logoutButton: document.querySelector("#logout-button"),
    studentLoginForm: document.querySelector("#student-login-form"),
    staffLoginForm: document.querySelector("#staff-login-form"),
    studentLoginError: document.querySelector("#student-login-error"),
    staffLoginError: document.querySelector("#staff-login-error"),
    backToStudentLogin: document.querySelector("#back-to-student-login"),
    bookingForm: document.querySelector("#booking-form"),
    facility: document.querySelector("#facility"),
    equipmentWrap: document.querySelector("#equipment-option-wrap"),
    equipmentOption: document.querySelector("#equipment-option"),
    date: document.querySelector("#booking-date"),
    startTime: document.querySelector("#start-time"),
    endTime: document.querySelector("#end-time"),
    feedback: document.querySelector("#booking-feedback"),
    studentBookings: document.querySelector("#student-bookings"),
    staffBookings: document.querySelector("#staff-bookings"),
    accountDetails: document.querySelector("#account-details"),
    studentTabs: Array.from(document.querySelectorAll("[data-student-tab]")),
    staffTabs: Array.from(document.querySelectorAll("[data-staff-tab]")),
    maintenanceForm: document.querySelector("#maintenance-form"),
    maintenanceFacility: document.querySelector("#maintenance-facility"),
    maintenanceEquipmentWrap: document.querySelector("#maintenance-equipment-wrap"),
    maintenanceEquipment: document.querySelector("#maintenance-equipment"),
    maintenanceDate: document.querySelector("#maintenance-date"),
    maintenanceStart: document.querySelector("#maintenance-start"),
    maintenanceEnd: document.querySelector("#maintenance-end"),
    maintenanceFeedback: document.querySelector("#maintenance-feedback"),
    maintenanceList: document.querySelector("#maintenance-list")
  };
  
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showView(id) {
    viewIds.forEach((viewId) => document.querySelector(`#${viewId}`).classList.toggle("hidden", viewId !== id));
    const loggedIn = id === "student-portal" || id === "staff-portal";
    elements.staffLoginLink.classList.toggle("hidden", loggedIn || id === "staff-login-view");
    elements.logoutButton.classList.toggle("hidden", !loggedIn);
  }

  function showLoginError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
  }

  function getFacility(id) {
    return store.facilities.find((facility) => facility.id === id);
  }

  function selectedEquipment(formData) {
    return formData.get("facilityId") === "equipment" ? formData.get("equipmentOption") : "";
  }

  function toHour(time) {
    return Number(String(time).split(":")[0]);
  }

  function resourcesMatch(record, facilityId, equipmentOption) {
    return record.facilityId === facilityId &&
      (facilityId !== "equipment" || record.equipmentOption === equipmentOption);
  }

  function timesOverlap(record, startTime, endTime) {
    return toHour(startTime) < toHour(record.endTime) &&
      toHour(endTime) > toHour(record.startTime);
  }

  function checkConflict(facilityId, date, startTime, endTime, equipmentOption) {
    const bookingConflict = store.getBookings().some((booking) =>
      booking.status !== "Cancelled" &&
      booking.date === date &&
      resourcesMatch(booking, facilityId, equipmentOption) &&
      timesOverlap(booking, startTime, endTime)
    );

    const maintenanceConflict = store.getMaintenance().some((record) =>
      record.date === date &&
      resourcesMatch(record, facilityId, equipmentOption) &&
      timesOverlap(record, startTime, endTime)
    );

    return bookingConflict || maintenanceConflict;
  }

  window.checkConflict = checkConflict;

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(`${dateString}T00:00:00`));
  }
  /* function to generate a booking id, returns the id after saving for user to view */
  function generateBookingId() {
    const ids = new Set(store.getBookings().map((booking) => booking.id));
    let id;
    do {
      id = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
    } while (ids.has(id));
    return id;
  }

  function showFeedback(element, type, message) {
    element.textContent = message;
    element.className = `feedback ${type}`;
  }

  function isCurrentBooking(booking) {
    if (booking.status === "Cancelled") return false;
    const end = new Date(`${booking.date}T${booking.endTime}:00`);
    return end > new Date();
  }

  function currentUserBookings() {
    return store.getBookings().filter((booking) =>
      booking.roomNumber.toUpperCase() === currentUser.roomNumber.toUpperCase() &&
      isCurrentBooking(booking)
    );
  }

  function maximumBookingDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return store.today(date);
  }

  function bookingCard(booking, allowCancel) {
    const cancelled = booking.status === "Cancelled";
    const itemName = booking.equipmentOption
      ? `${booking.facilityName} — ${booking.equipmentOption}`
      : booking.facilityName;

    return `
      <article class="booking-card">
        <div>
          <div>
            <h3>${escapeHtml(itemName)}</h3>
            <span class="status ${cancelled ? "cancelled" : ""}">${escapeHtml(booking.status)}</span>
          </div>
          <p>${escapeHtml(formatDate(booking.date))} · ${escapeHtml(booking.startTime)}–${escapeHtml(booking.endTime)}</p>
          <small>${escapeHtml(booking.id)} · ${escapeHtml(booking.roomNumber)}</small>
        </div>
        ${allowCancel && !cancelled ? `
          <button type="button" data-cancel-id="${escapeHtml(booking.id)}" class="cancel-button">
            Cancel booking
          </button>
        ` : ""}
      </article>
    `;
  }

  function renderBookings() {
    const allBookings = store.getBookings();
    const studentBookings = currentUserBookings();

    elements.studentBookings.innerHTML = studentBookings.length
      ? studentBookings.map((booking) => bookingCard(booking, true)).join("")
      : '<div class="empty">You have no current bookings.</div>';

    elements.staffBookings.innerHTML = allBookings.length
      ? allBookings.slice().reverse().map((booking) => bookingCard(booking, true)).join("")
      : '<div class="empty">No bookings have been made yet.</div>';
  }

  function updateEquipmentSelect(facilitySelect, wrap, equipmentSelect) {
    const facility = getFacility(facilitySelect.value);
    const isEquipment = facility && facility.id === "equipment";
    wrap.classList.toggle("hidden", !isEquipment);
    equipmentSelect.required = isEquipment;
    equipmentSelect.innerHTML = isEquipment
      ? facility.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")
      : "";
  }

  function updateEquipmentOptions() {
    updateEquipmentSelect(elements.facility, elements.equipmentWrap, elements.equipmentOption);
  }

  function updateMaintenanceEquipmentOptions() {
    updateEquipmentSelect(
      elements.maintenanceFacility,
      elements.maintenanceEquipmentWrap,
      elements.maintenanceEquipment
    );
  }

  function activateStudentTab(button) {
    elements.studentTabs.forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      document.querySelector(`#${tab.dataset.studentTab}`).classList.toggle("hidden", !active);
    });
  }

  function activateStaffTab(button) {
    elements.staffTabs.forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      document.querySelector(`#${tab.dataset.staffTab}`).classList.toggle("hidden", !active);
    });
  }

  function handleBooking(event) {
    event.preventDefault();
    const formData = new FormData(elements.bookingForm);
    const facility = getFacility(formData.get("facilityId"));
    const date = formData.get("date");
    const startTime = formData.get("startTime");
    const endTime = formData.get("endTime");
    const equipmentOption = selectedEquipment(formData);

    if (!facility || !date || !startTime || !endTime || (facility.id === "equipment" && !equipmentOption)) {
      showFeedback(elements.feedback, "error", "Please complete all booking fields.");
      return;
    }
    if (date < store.today(new Date())) {
      showFeedback(elements.feedback, "error", "The booking date cannot be in the past.");
      return;
    }
    if (date > maximumBookingDate()) {
      showFeedback(elements.feedback, "error", "Bookings can only be made up to one year in advance.");
      return;
    }
    const duration = toHour(endTime) - toHour(startTime);
    if (duration <= 0) {
      showFeedback(elements.feedback, "error", "The end time must be after the start time.");
      return;
    }
    if (facility.id !== "equipment" && duration > 2) {
      showFeedback(elements.feedback, "error", "Indoor rooms can be booked for a maximum of two hours.");
      return;
    }
    if (currentUserBookings().length >= 3) {
      showFeedback(
        elements.feedback,
        "error",
        "Maximum of 3 current bookings reached. Further bookings are only available after a current booking expires or is cancelled."
      );
      return;
    }
    if (checkConflict(facility.id, date, startTime, endTime, equipmentOption)) {
      showFeedback(elements.feedback, "error", "That facility or item is unavailable because it is booked or under maintenance.");
      return;
    }

    const booking = store.addBooking({
      id: generateBookingId(),
      roomNumber: currentUser.roomNumber,
      residentName: currentUser.name,
      facilityId: facility.id,
      facilityName: facility.name,
      equipmentOption,
      date,
      startTime,
      endTime,
      status: "Confirmed"
    });

    elements.bookingForm.reset();
    elements.date.min = store.today(new Date());
    elements.startTime.value = "08:00";
    elements.endTime.value = "10:00";
    updateEquipmentOptions();
    renderBookings();
    showFeedback(elements.feedback, "success", `Booking submitted. Your reference is ${booking.id}. Status: Confirmed.`);
  }

  function renderMaintenance() {
    const records = store.getMaintenance().slice().reverse();
    elements.maintenanceList.innerHTML = records.length
      ? records.map((record) => {
          const itemName = record.equipmentOption
            ? `${record.facilityName} — ${record.equipmentOption}`
            : record.facilityName;
          return `
            <article class="booking-card">
              <div>
                <div>
                  <h3>${escapeHtml(itemName)}</h3>
                  <span class="status maintenance">Maintenance</span>
                </div>
                <p>${escapeHtml(formatDate(record.date))} · ${escapeHtml(record.startTime)}–${escapeHtml(record.endTime)}</p>
                <small>${escapeHtml(record.id)} · ${escapeHtml(record.notes)}</small>
              </div>
            </article>
          `;
        }).join("")
      : '<div class="empty">No maintenance has been scheduled.</div>';
  }
 
  /* function to handle maintenance bookings, returns the record after saving for admin to view */
  function handleMaintenance(event) {
    event.preventDefault();
    const formData = new FormData(elements.maintenanceForm);
    const facility = getFacility(formData.get("facilityId"));
    const equipmentOption = formData.get("facilityId") === "equipment"
      ? formData.get("equipmentOption")
      : "";
    const date = formData.get("date");
    const startTime = formData.get("startTime");
    const endTime = formData.get("endTime");
    const notes = String(formData.get("notes") || "").trim();
    /* logical checking via if statements */
    if (!facility || !date || !startTime || !endTime || !notes ||
        (facility.id === "equipment" && !equipmentOption)) {
      showFeedback(elements.maintenanceFeedback, "error", "Please complete all maintenance fields.");
      return;
    }
    if (date < store.today(new Date())) {
      showFeedback(elements.maintenanceFeedback, "error", "Maintenance cannot be scheduled in the past.");
      return;
    }
    if (toHour(endTime) <= toHour(startTime)) {
      showFeedback(elements.maintenanceFeedback, "error", "The end time must be after the start time.");
      return;
    }
    if (checkConflict(facility.id, date, startTime, endTime, equipmentOption)) {
      showFeedback(elements.maintenanceFeedback, "error", "That facility or item already has a booking or maintenance during this time.");
      return;
    }

    const record = store.addMaintenance({
      id: `MT-${Date.now().toString().slice(-6)}`,
      facilityId: facility.id,
      facilityName: facility.name,
      equipmentOption,
      date,
      startTime,
      endTime,
      notes
    });

    elements.maintenanceForm.reset();
    elements.maintenanceStart.value = "08:00";
    elements.maintenanceEnd.value = "10:00";
    updateMaintenanceEquipmentOptions();
    renderMaintenance();
    showFeedback(elements.maintenanceFeedback, "success", `Maintenance scheduled. Reference: ${record.id}.`);
  }

  function cancelFromClick(event) {
    const button = event.target.closest("[data-cancel-id]");
    if (!button) return;
    if (store.cancelBooking(button.dataset.cancelId)) renderBookings();
  }

  function bindEvents() {
    elements.staffLoginLink.addEventListener("click", () => showView("staff-login-view"));
    elements.backToStudentLogin.addEventListener("click", () => showView("login-view"));
    elements.logoutButton.addEventListener("click", () => {
      elements.studentLoginForm.reset();
      elements.staffLoginForm.reset();
      elements.maintenanceForm.reset();
      currentUser = store.student;
      showView("login-view");
    });

    elements.studentLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(elements.studentLoginForm);
      const authenticatedUser = store.authenticateStudent(
        formData.get("roomNumber"),
        formData.get("password")
      );
      if (!authenticatedUser) {
        showLoginError(elements.studentLoginError, "Incorrect hirer account ID or password.");
        return;
      }
      currentUser = authenticatedUser;
      elements.studentLoginError.classList.add("hidden");
      renderAccountDetails();
      renderBookings();
      showView("student-portal");
    });

    elements.staffLoginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(elements.staffLoginForm);
      const userMatches = String(formData.get("user")).trim() === store.credentials.staff.user;
      const passwordMatches = formData.get("password") === store.credentials.staff.password;
      if (!userMatches || !passwordMatches) {
        showLoginError(elements.staffLoginError, "Incorrect staff user ID or password.");
        return;
      }
      elements.staffLoginError.classList.add("hidden");
      renderBookings();
      renderMaintenance();
      showView("staff-portal");
    });

    elements.studentTabs.forEach((tab) => tab.addEventListener("click", () => activateStudentTab(tab)));
    elements.staffTabs.forEach((tab) => tab.addEventListener("click", () => activateStaffTab(tab)));
    elements.facility.addEventListener("change", updateEquipmentOptions);
    elements.maintenanceFacility.addEventListener("change", updateMaintenanceEquipmentOptions);
    elements.bookingForm.addEventListener("submit", handleBooking);
    elements.maintenanceForm.addEventListener("submit", handleMaintenance);
    elements.studentBookings.addEventListener("click", cancelFromClick);
    elements.staffBookings.addEventListener("click", cancelFromClick);
  }
  function renderAccountDetails() {
    elements.accountDetails.innerHTML = `
      <div><dt>Name</dt><dd>${escapeHtml(currentUser.name)}</dd></div>
      <div><dt>Hirer account ID</dt><dd>${escapeHtml(currentUser.roomNumber)}</dd></div>
      <div><dt>Organisation</dt><dd>${escapeHtml(currentUser.organisation || currentUser.residence)}</dd></div>
      <div><dt>Email</dt><dd>${escapeHtml(currentUser.email)}</dd></div>
      <div><dt>Phone</dt><dd>${escapeHtml(currentUser.phone || "Not recorded")}</dd></div>
    `;
  }

  /* function to initialise the form, returns the form after saving for user to view */
  function initialise() {
    const facilityOptions = store.facilities
      .map((facility) => `<option value="${escapeHtml(facility.id)}">${escapeHtml(facility.name)}</option>`)
      .join("");
    elements.facility.innerHTML = facilityOptions;
    elements.maintenanceFacility.innerHTML = facilityOptions;
    const timeOptions = hours
      .map((hour) => {
        const time = `${String(hour).padStart(2, "0")}:00`;
        return `<option value="${time}">${time}</option>`;
      })
      .join("");
    elements.startTime.innerHTML = timeOptions;
    elements.endTime.innerHTML = timeOptions;
    elements.maintenanceStart.innerHTML = timeOptions;
    elements.maintenanceEnd.innerHTML = timeOptions;
    elements.startTime.value = "08:00";
    elements.endTime.value = "10:00";
    elements.maintenanceStart.value = "08:00";
    elements.maintenanceEnd.value = "10:00";
    elements.date.min = store.today(new Date());
    elements.date.max = maximumBookingDate();
    elements.maintenanceDate.min = store.today(new Date());
    renderAccountDetails();
    updateEquipmentOptions();
    updateMaintenanceEquipmentOptions();
    renderBookings();
    renderMaintenance();
    bindEvents();
  }

  initialise();
})();
