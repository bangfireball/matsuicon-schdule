
/*---- Build schedule view ----*/
function buildScheduleViewSelector() {
  //View
  if (scheduleViewType === 'resourceTimeGridDay') {
    buildScheduleDayView();
  } else {
    buildScheduleListView();
  }

  buildSchedulePrintContent();
}

/*---- Build schedule list ----*/
//Filter option
$('#session-filter-side-panel-close-btn').on('click', function(e) {
  $('#session-filter-side-panel').addClass('hide');
  $('body').removeClass('noscroll');
});

// Filter option
function buildFilterOptions() {
  $('.schedule-filter-status-option').on('change', listenForFilterChanges);

  // Tracks
  const filterTrackMSList = document.querySelector('multi-select.schedule-filter-track');
  if (filterTrackMSList) {
    const trackMultiSelectList = buildSelectableList(allTracks);
    filterTrackMSList.addItems(trackMultiSelectList);
    filterTrackMSList.addEventListener("selectionchange", listenForFilterChanges);
  }

  // Types
  const filterTypeMSList = document.querySelector('multi-select.schedule-filter-type');
  if (filterTypeMSList) {
    const tagMultiSelectList = buildSelectableList(allTags);
    filterTypeMSList.addItems(tagMultiSelectList);
    filterTypeMSList.addEventListener("selectionchange", listenForFilterChanges);
  }

  // Location
  const filterLocationMSList = document.querySelector('multi-select.schedule-filter-location');
  if (filterLocationMSList) {
    const locationObj = {};
    const uniqueLocations = new Set();

    // We don't store location information as a key value pair
    //  We have to get these from the session list
    Object.values(scheduleList.all_sessions).forEach((v,i) => {
      if (baseValidateString(v.location, 'length') && !uniqueLocations.has(v.location)) {
        locationObj[i] = [v.location];
        uniqueLocations.add(v.location);
      }
    });

    filterLocationMSList.addItems(locationObj);
    filterLocationMSList.addEventListener("selectionchange", listenForFilterChanges);
  }
}

function listenForFilterChanges() {
  // Status
  const statusFilterElements = document.querySelectorAll('checkbox-element.schedule-filter-status-option');
  statusFilter = [];
  statusFilterElements.forEach(element => {
    if (element.isChecked()) {
      statusFilter.push(element.dataset.value);
    }
  });

  const filterTrackMSList = document.querySelector('multi-select.schedule-filter-track');
  const filterTypeMSList = document.querySelector('multi-select.schedule-filter-type');

  const filterGuestMSList = document.querySelector('multi-select.schedule-filter-guest');

  const filterLocationMSList = document.querySelector('multi-select.schedule-filter-location');

  trackFilter = filterTrackMSList.getSelected();
  typeIdFilter = filterTypeMSList.getSelected();
  typeFilter = filterTypeMSList.getSelectedNames();
  
  guestFilter = filterGuestMSList.getSelected();

  locationFilter = filterLocationMSList.getSelectedNames();

  buildScheduleViewSelector();
}

$('#clear-schedule-filters-btn').on('click', function(e) {
  e.preventDefault();
  
  const statusFilterElements = document.querySelectorAll('checkbox-element.schedule-filter-status-option');
  statusFilterElements.forEach(element => {
    if (element.isChecked()) {
      element.toggleCheck(false);
    }
  });

  const filterTrackMSList = document.querySelector('multi-select.schedule-filter-track');
  const filterTypeMSList = document.querySelector('multi-select.schedule-filter-type');

  const filterGuestMSList = document.querySelector('multi-select.schedule-filter-guest');

  const filterLocationMSList = document.querySelector('multi-select.schedule-filter-location');
  filterTrackMSList.resetDropdown();
  filterTypeMSList.resetDropdown();

  filterGuestMSList.resetDropdown();
  filterLocationMSList.resetDropdown();

  listenForFilterChanges();
});

/**
 * Builds and returns a sorted array of date selector objects for a schedule,
 * based on filtered session data and the currently selected date.
 *
 * Each date selector object contains:
 * - date_group: ISO date string (YYYY-MM-DD) for the group
 * - date_group_full: Human-readable full date label
 * - time_limit_min: Earliest session start timestamp (in seconds) for the date
 * - time_limit_max: Latest session end timestamp (in seconds) for the date
 * - selected: Boolean indicating if this date is currently selected
 *
 * Handles sessions that span multiple days, ensures at least one date is selected,
 * and generates appropriate labels for each date.
 *
 * @returns {Array<Object>} Sorted array of date selector objects for the schedule.
 */
function renderScheduleDateSelectors(allSessions) {
  // Build a filtered list of sessions based on active filters
  let temp = [];
  Object.values(allSessions).forEach(item => {
    if (checkFilterValues(item)) temp.push(item);
  });

  // Create a list of dates based on the filtered sessions
  const groups = {};
  const currSelectedDate = $('.schedule-day-btn.selected').data('date_group');
  let hasSelected = false;

  temp.forEach(item => {
    const start = new Date(item.start_calendar);
    const end = new Date(item.end_calendar);

    let current = new Date(start);

    // Looping through because some sessions may span multiple days
    while (current <= end) {
      const dateStr = current.getFullYear() + '-' +
                      String(current.getMonth() + 1).padStart(2, '0') + '-' +
                      String(current.getDate()).padStart(2, '0');
      const timestampStart = new Date(dateStr + "T00:00:00").getTime() / 1000;

      const timestampEnd = new Date(dateStr + "T23:59:59").getTime() / 1000;

      // Choose full date label:
      // Use start_date_full for the first day, end_date_full for the last day,
      // and generate one for middle days.
      const dateFull = current.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // Create group if doesn't exist
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date_group: dateStr,
          date_group_full: dateFull,
          time_limit_min: timestampEnd,
          time_limit_max: timestampStart,
          selected: dateStr === currSelectedDate
        };

        // Track if any date has been selected
        if (!hasSelected && dateStr === currSelectedDate) {
          hasSelected = true;
        }
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }
  });

  // Sort by date
  const result = Object.values(groups).sort((a, b) =>
    a.date_group.localeCompare(b.date_group)
  );

  // If no date is selected, default to the first one
  if (!hasSelected && result.length > 0) {
    result[0].selected = true;
  }

  return result;
}

/**
 * Checks if a given session passes all active filters
 * When multiple filters are applied, a session must satisfy all conditions to be included
 * If a filter has no active selections, it is considered as passed
 * 
 * @param {Object} session Session to evaluate
 * @returns Boolean indicating if session passes all active filters
 */
function checkFilterValues(session) {
  // Search filters
  // Search should cover session name, track name, type name, or guest names
  const isSearchTerm = searchTerm.length == 0
      || session.title.toLowerCase().includes(searchTerm.toLowerCase()) // session name
      || session.tags?.toLowerCase().includes(searchTerm.toLowerCase()) // type name
      || (
        session.guests?.length > 0 
        && (
          session.guests.some(guest => (guest.first_name + ' ' + guest.last_name).toLowerCase().includes(searchTerm.toLowerCase())) // guest full name
          || session.guests.some(guest => guest.alias.toLowerCase().includes(searchTerm.toLowerCase())) // guest alias
          || session.guests.some(guest => guest.preferred_name.toLowerCase().includes(searchTerm.toLowerCase())) // guest preferred name
          || session.guests.some(guest => guest.display_name.toLowerCase().includes(searchTerm.toLowerCase())) // guest display name
        )
      );

  // Session filters
  const isSessionFilter = ((visibilityFilter == 'all' || visibilityFilter == '') || visibilityFilter == session.access_type)
    && (
      (statusFilter.length == 0 || statusFilter.length == 2)
      || statusFilter.includes(session.status)
    )
    && (trackFilter.length == 0 || trackFilter.includes(session.track_id))
    && (typeFilter.length == 0 || (baseValidateString(session.tags, 'length') && session.tags.split('|').some(tag => typeFilter.includes(tag))));

  // People filters
  const hasFilter = (filter, arr, key) =>
    filter.length === 0 ||
    (filter.length > 0 && arr?.length > 0 && arr.some(item => filter.includes(String(item[key]))));

  const isGuestFilter   = hasFilter(guestFilter, session.guests, 'id');

  // Map/Location filters
  const isLocationFilter = (locationFilter.length == 0 || locationFilter.includes(session.location));

  return isSearchTerm && isSessionFilter && isGuestFilter && isLocationFilter;
}

/**
 * Returns true if an event overlaps any part of a given date.
 *
 * Possible sessions:
 * 1. Single-day session fully within the day
 * 2. Multi-day session fully within the day
 * 3. Multi-day session starting before and ending within the day
 * 4. Multi-day session starting within and ending after the day
 * 5. Multi-day session spanning the entire day
 * 
 * @param {object} session
 * @returns {boolean}
 */
function eventOccursOnDate(session) {
  const selectedDate = $('.schedule-day-btn.selected').data('date_group');

  const dayStart = new Date(selectedDate + 'T00:00:00');
  const dayEnd   = new Date(selectedDate + 'T23:59:59.999');

  const eventStart = new Date(session.start_calendar);
  const eventEnd   = new Date(session.end_calendar);

  return eventStart < dayEnd && eventEnd > dayStart;
}

//Day view
function buildScheduleDayView() {
  //Reset
  $('#event-schedule-error').html('');
  
  //Variables
  let html = '';

  //Build
  if (scheduleList.success == false) {
    $('#event-schedule-error').html(scheduleList.err_msg);
    return;
  }

  //Setup
  html = '';
  if (!$('#schedule-list-top').length || !$('#schedule-list-body').length) {
    html += '<div id="schedule-list-top" class="col-12 flex overflow-hidden-x"></div>';
    html += '<div id="schedule-list-body" class="col-12 white rounded-big overflow-x-scroll"></div>';
    $('#event-schedule-content').html(html);
  }

  // Render selectable dates
  const headerResult = renderScheduleDateSelectors(scheduleList.all_sessions);
  let headerHtml = '';
  $.each(headerResult, function(i,v) {
    headerHtml += `<div class="schedule-day-btn flex flex-row justify-center items-center rounded-big mr-half ${(v.selected ? 'selected' : '')}" data-time_limit_min="${v.time_limit_min}" data-time_limit_max="${v.time_limit_max}" data-date_group="${v.date_group}">${v.date_group_full}</div>`;
  });
  $('#event-schedule-content #schedule-list-top').html(headerHtml);

  //Body
  $('#event-schedule-content #schedule-list-body').html('');
  let scheduleEvents = [],
    scheduleListContainer = document.getElementById('schedule-list-body'), 
    slotMaxTime = 0,
    slotMinTime = 24,
    classNames = [],
    resources = [], 
    trackExists = true,
    existingTrackIds = [];

  $.each(scheduleList.all_sessions, function(i,v) {
    if (!checkFilterValues(v) || !eventOccursOnDate(v)) {
      return;
    }

    classNames = ['pointer', 'schedule_id_' + v.id];

    if (baseValidateNumber(v.hide_end_time, 'positive') && v.hide_end_time == 1) {
      classNames.push('schedule_hide_end_time');
    }

    let dateText = '';
    if (v.hide_end_time == 1) {
      dateText = `${v.start_date_full}, ${v.start_min}`;
    } else if (v.start_date == v.end_date) {
      dateText = `${v.start_date_full}, ${v.start_min}  -  ${v.end_min}`;
    } else {
      dateText = `${v.start_date_full}, ${v.start_min}  -  ${v.end_date_full}, ${v.end_min}`;
    }

    const startTime = formatEpochToISO(v.start_time, true);
    const endTime = formatEpochToISO(v.end_time, true);
    const isDateChanged = startTime.slice(0, 10) !== endTime.slice(0, 10);

    // This builds a list of sessions to add to the calendar
    scheduleEvents.push({
      id: v.id, 
      backgroundColor: v.background_color,
      borderColor: v.border_color, 
      className: classNames, 
      end: v.end_calendar,
      resourceId: v.track_id, 
      start: v.start_calendar, 
      textColor: v.text_color, 
      title: v.title.replace(/&amp;/g, '&'), 
      resourceId: v.track_id,
      extendedProps: {
        description: v.description_display,
        status: v.status,
        guests: (v.guests || []).filter(g => g.status === 'confirmed'),
        location: v.location,
        tags: v.tags,
        readableDate: dateText,
        userSaved: v.user_saved,
        isOvernight: isDateChanged,
        tickets: v.access_key,
        status: v.status,
        startGoogleCalendar: v.start_google_calendar,
        endGoogleCalendar: v.end_google_calendar,
        eventTimeZone: scheduleList.timezone,
      }
    });

    // Add track to resources
    if (v.track_id > 0 && activeTracks[v.track_id] && !existingTrackIds.includes(v.track_id)) {
      existingTrackIds.push(v.track_id);

      resources.push({
        id: v.track_id,
        order: Number(activeTracks[v.track_id].tag_order),
        title: $('<textarea />').html(activeTracks[v.track_id].title).text(),
      });
    }

    if (v.track_id == 0 && trackExists) {
      trackExists = false;
    }

    // If the session is on the selected day, then calculate the min and max heights
    const selectedDate = $('.schedule-day-btn.selected').data('date_group');

    // Get hour
    const startHour = new Date(v.start_calendar).getHours();
    const endHour = new Date(v.end_calendar).getHours();

    if (selectedDate) {
      // selectedDate is 'YYYY-MM-DD'
      let dayStart = new Date(selectedDate + "T00:00:00");
      let dayEnd = new Date(selectedDate + "T23:59:59.999");
      let eventStart = new Date(v.start_calendar);
      let eventEnd = new Date(v.end_calendar);

      // If event starts before this day, show from midnight
      if (eventStart < dayStart) {
        slotMinTime = 0;
      } else {
        slotMinTime = Math.min(parseInt(startHour), slotMinTime);
      }

      // If event extends past this day, show until midnight
      if (eventEnd > dayEnd || isDateChanged) {
        slotMaxTime = 24;
      } else {
        slotMaxTime = Math.max(Math.min(parseInt(endHour) + 1, 24), slotMaxTime);
      }
    }
  });

  // Insert an empty track if no track exists
  if (!trackExists) {
    resources.push({
      id: 0, 
      order: 999, 
      title: ' ',
    });
  }

  if (slotMaxTime <= slotMinTime) {
    slotMinTime = 0;
    slotMaxTime = 24;
  }

  if (scheduleEvents.length > 0) {
    fullcalendarObj = new FullCalendar.Calendar(scheduleListContainer, {
      allDaySlot: false,
      editable: false,
      events: scheduleEvents,
      eventDidMount: function(info) {
        $('#schedule-list-body .fc-resourceTimeGridDay-view .fc-event-container .schedule_hide_end_time .fc-event-time span').each(function() {
          $(this).html($(this).parent().data('start'));
        });

        let el = info.el;

        // Overnight event time display
        if (info.event.extendedProps.isOvernight) {
          const startDate = new Date(info.event.start).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          const startTime = new Date(info.event.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const endDate = new Date(info.event.end).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
          const endTime = new Date(info.event.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

          const timeEl = el.querySelector('.fc-event-time');
          if (timeEl) {
            // Add a delay for replacing the original time to avoid duplicate timestamps
            setTimeout(() => {
              timeEl.innerHTML = `<span data-start="${startDate}">${startDate}, ${startTime}</span> - <span data-end="${endDate}">${endDate}, ${endTime}</span>`;
            }, 100);
          }
        }

        // Cancelled status styling
        if (info.event.extendedProps.status === 'cancelled') {
          el.classList.add('session-cancelled');
        }

        let width = (resources.length * 183) > $('#schedule-list-body').width() ? (resources.length * 183) + 'px' : '100%';

        $('#schedule-list-body .fc-view-harness .fc-resourceTimeGridDay-view > table').css({
          'cursor': 'grab', 
          'maxWidth': width,
          'width': width,
        });

        if (
          (!isMobileDevice() && resources.length > 5)
          || (isMobileDevice() && resources.length > 1)
        ) {
          handleScheduleScroll();
        }
        
        info.el.addEventListener('touchend', function(e) {
          e.preventDefault();
          info.view.calendar.trigger('eventClick', info);
        });
      },
      eventClick: function(info) {
        if (!isDragging) {
          activeSessionId = info.event.id;
          window.open(`/events/schedule/?id=${eventId}&session=${activeSessionId}`, '_blank');
        }
      },
      eventMouseEnter: function(info) {
        isHoveringEvent = true;
        showHoverCard(info);
      },
      eventMouseLeave: function(info) {
        isHoveringEvent = false;
        hideHoverCard();
      },
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: 'short'
      },
      headerToolbar: {
        left: '',
        center: '',
        right: ''
      },
      height: 'auto',
      initialDate: $('#schedule-list-top .schedule-day-btn.selected').data('date_group'),
      initialView: 'resourceTimeGridDay',
      nowIndicator: true,
      resources: resources,
      resourceOrder: 'order,id',
      schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source',
      slotEventOverlap: false,
      slotMaxTime: (slotMaxTime < 10 ? '0' : '') + slotMaxTime + ':00:00',
      slotMinTime: (slotMinTime < 10 ? '0' : '') + slotMinTime + ':00:00',
      resourceAreaWidth: 200,
    });

    fullcalendarObj.render();

    // Reset scroll position
    const $scroller = $('#schedule-list-body .fc-view-harness .fc-resourceTimeGridDay-view .fc-timegrid-body');
    const $sessionTable = $scroller.find('> .fc-timegrid-cols'); // events container
    const $trackTable = $('.fc-col-header'); // table containing header cells

    $sessionTable.css('transform', `translateX(0px)`);
    $trackTable.css('transform', `translateX(0px)`);
  } else {
    const defaultText = `
        <div class="flex flex-wrap width-full height-full items-center justify-center" style="height: 150px;">
          <div class="col-12 flex flex-wrap justify-center">
            <div class="col-12 text-center mt2 px2 size-16">
              There are no sessions${scheduleList.all_sessions == 0 ? '' : ' matching the search term'}
            </div>
          </div>
        </div>
      `;
    $('#schedule-list-top').html('');
    $('#schedule-list-body').html(defaultText);
  }

  //Actions
  buildScheduleActions();
}

function handleScheduleScroll() {
  // Make sure scrolling works with the sticky header
  const $scroller = $('#schedule-list-body .fc-view-harness .fc-resourceTimeGridDay-view .fc-timegrid-body');
  const $sessionTable = $scroller.find('> .fc-timegrid-cols'); // events container
  const $trackTable = $('.fc-col-header'); // table containing header cells

  const $axisCol = $sessionTable.find('.fc-timegrid-col.fc-timegrid-axis');
  const $axisHeader = $trackTable.find('.fc-col-header-cell.fc-timegrid-axis');

  let startX = 0;
  let startOffset = 0;
  let dragStartX, dragStartY;
  let isPointerDown = false;
  let isHorizontalDrag = null;

  $scroller.off('.dragscroll');
  $scroller.on('mousedown.dragscroll touchstart.dragscroll', function(e) {
    isDragging = false;
    isPointerDown = true;
    isHorizontalDrag = null; // reset direction

    let ev;
    if (e.type === 'mousedown') {
      startX = e.clientX;
      ev = e;
    } else if (e.type === 'touchstart') {
      startX = e.originalEvent.touches[0].clientX;
      ev = e.originalEvent.touches[0];
    }
    if (!ev) return;
    dragStartX = ev.clientX;
    dragStartY = ev.clientY;

    // Read current transform applied to the body table
    // getComputedStyle(el).transform returns something like: "matrix(1, 0, 0, 1, 120, 0)"
    // DOMMatrix parses this into an object so we can directly access the translation values.
    // m41 = horizontal translation (X offset), m42 = vertical translation (Y offset)
    const bodyMatrix = new WebKitCSSMatrix(getComputedStyle($sessionTable[0]).transform);
    startOffset = bodyMatrix.m41 || 0;

    $(this).css('cursor', 'grabbing');
  });

  $scroller.off('.dragscroll-move');
  $scroller.on('mousemove.dragscroll-move touchmove.dragscroll-move', function(e) {
    if (!isPointerDown) return;

    let x;
    let ev;
    if (e.type === 'mousemove') {
      x = e.clientX;
      ev = e;
    } else if (e.type === 'touchmove') {
      x = e.originalEvent.touches[0].clientX;
      ev = e.originalEvent.touches[0];
    }

    if (!ev) return;
    const dx = ev.clientX - dragStartX;
    const dy = ev.clientY - dragStartY;

    // Decide direction after small threshold
    if (isHorizontalDrag === null && Math.hypot(dx, dy) > 5) {
      isHorizontalDrag = Math.abs(dx) > Math.abs(dy);
    }

    if (isHorizontalDrag === false) {
      // vertical scroll → let browser handle it
      return;
    }

    if (isHorizontalDrag === true) {
      e.preventDefault(); // block only horizontal scroll
      isDragging = true;

      let viewportWidth = $('#schedule-list-body').width();
      let contentWidth = $('#schedule-list-body .fc-view-harness .fc-resourceTimeGridDay-view > table').width();

      const dxTotal = x - startX;
      let newX = startOffset + dxTotal;

      const maxWidth = contentWidth - viewportWidth;
      const minWidth = 0;

      if (newX > minWidth) newX = minWidth;
      if (newX < -maxWidth) newX = -maxWidth;

      $sessionTable.css('transform', `translateX(${newX}px)`);
      $trackTable.css('transform', `translateX(${newX}px)`);

      $axisCol.css({ transform: 'translateX(0)', position: 'sticky', left: 0, 'z-index': 5 });
      $axisHeader.css({ transform: 'translateX(0)', position: 'sticky', left: 0, 'z-index': 6 });
    }
  });

  $scroller.off('.dragscroll-stop');
  $scroller.on('mouseup.dragscroll-stop mouseleave.dragscroll-stop touchend.dragscroll-stop', function() {
    isPointerDown = false;
    
    if (isDragging) {
      isDragging = false;
      $scroller.css('cursor', 'default');
    }
  });
}

/*---- Hover card ----*/
function showHoverCard(target) {
  const calendarContainer = document.getElementById('schedule-list-body'); // adjust if your container has a different ID

  const rect = target.el.getBoundingClientRect();
  const containerRect = calendarContainer.getBoundingClientRect();
  
  // This positions it right below the title
  const top = ((rect.top - containerRect.top) > (rect.bottom - containerRect.top) ? (rect.bottom - containerRect.top) : (rect.top - containerRect.top + 175));
  const left = rect.left - containerRect.left;

  // Build guest HTML
  let guestHtml = '';
  if (target.event.extendedProps.guests.length > 0) {
    guestHtml = target.event.extendedProps.guests.map(guest => {
      return `
        <div class="col-3 flex flex-wrap justify-around text-center mb2">
          <img src="${guest.image?.length > 0 ? ('/event-pics/' + guest.image) : '/images/evee/evee-profile-circle.png'}" class="col-12 circle" style="width: 50px; height: 50px; border: 0.5px solid gray;">
          <span class="col-12 mt1 size-12">${GuestUtils.resolveDisplayName(guest)}</span>
        </div>
      `;
    }).join('');
  }

  // Build tag HTML
  let tagsHtml = '';
  if (target.event.extendedProps.tags?.length > 0) {
    tagsHtml = target.event.extendedProps.tags.split('|').map(tag => {
      return `<span class="tag-25 stronger text-gray-9D mr-half mt-half">${tag}</span>`;
    }).join('');
  }

  // Update content
  // Update the redirect link
  $('#hover-card .view-session-detail').attr('href', `/events/schedule/?id=${eventId}&session=${target.event.id}`);
  $('#hover-card .add-to-schedule').attr('data-session', target.event.id).data('session', target.event.id);

  if (target.event.extendedProps.status === 'cancelled') {
    $('#hover-card .add-to-schedule').addClass('hide');
  } else {
    $('#hover-card .add-to-schedule').removeClass('hide');
  }
  
  //Initial state for save:
  if (target.event.extendedProps.userSaved == 1) {
    $('#hover-card .add-to-schedule').html(`<i class="uis uis-heart"></i>Added to my schedule`);
  } else {
    $('#hover-card .add-to-schedule').html(`<i class="uil uil-heart"></i>Add to my schedule`);
  }

  $('#hover-card .hover-card-title').text(target.event.title);
  $('#hover-card .hover-card-description').html(target.event.extendedProps.description);
  $('#hover-card .hover-card-status').html(`
    <span class="pill ${target.event.extendedProps.status}">
      ${capitalizeFirstLetter(target.event.extendedProps.status)}
    </span>
  `);

  const googleCalendarLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(target.event.title + ' via Eventeny')}&dates=${encodeURIComponent(target.event.extendedProps.startGoogleCalendar)}/${encodeURIComponent(target.event.extendedProps.endGoogleCalendar)}&ctz=${encodeURIComponent(target.event.extendedProps.timezone)}&location=${encodeURIComponent(target.event.extendedProps.location ?? '')}&details=${encodeURIComponent(target.event.extendedProps.description ?? '')}<br /><br />${encodeURIComponent(`https://www.eventeny.com/events/schedule/?id=${eventId}&session=${target.event.id}`)}`;

  const addToCalendarText = `
      <a class="link text-secondary-2 ml-half" title="Add to calendar" target="_blank"
        href="${googleCalendarLink}"><i class="uil uil-calendar-alt"></i></a>
  `;

  $('#hover-card .hover-card-time').html(target.event.extendedProps.readableDate + addToCalendarText);
  $('#hover-card .hover-card-location').text(target.event.extendedProps.location);
  

  if (guestHtml.length > 0) {
    $('#hover-card .hover-card-guest-list-container').removeClass('hide');
  } else {
    $('#hover-card .hover-card-guest-list-container').addClass('hide');
  }
  $('#hover-card .hover-card-guest-list').html(guestHtml);

  
  if (tagsHtml.length > 0) {
    $('#hover-card .hover-card-type-list-container').removeClass('hide');
  } else {
    $('#hover-card .hover-card-type-list-container').addClass('hide');
  }
  $('#hover-card .hover-card-type-list').html(tagsHtml);

  if (target.event.extendedProps.tickets?.length > 0) {
    $('#hover-card .hover-card-ticket-container').removeClass('hide');
    $('#hover-card .hover-card-ticket-container a').attr('href', `/events/ticket/?id=${eventId}&custom=${target.event.extendedProps.tickets}`);
  } else {
    $('#hover-card .hover-card-ticket-container').addClass('hide');
    $('#hover-card .hover-card-ticket-container a').attr('href', ``);
  }

  $('#hover-card').css({ top: top + 'px', left: left + 'px' }).removeClass('hide');

  // Reposition hover card if it overflows the container's visible area:
  // - overflows right edge → align card's right edge to event's right edge
  // - overflows bottom edge → flip card above the event
  const hoverCard = document.getElementById('hover-card');
  const hoverRect = hoverCard.getBoundingClientRect();
  if (hoverRect.right > containerRect.right) hoverCard.style.left = (rect.right - containerRect.left - hoverRect.width) + 'px';
  if (hoverRect.bottom > containerRect.bottom) hoverCard.style.top = (rect.top - containerRect.top - hoverRect.height + 120) + 'px';

  setupExpandableTextToggle();
}

/**
 * debounce - Creates a debounced version of a function that delays its execution
 *            until after a specified delay period has passed since the last time it was invoked.
 *            Uses requestAnimationFrame for smoother performance and better visual timing.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The number of milliseconds to wait after the last call before executing.
 * @returns {Function} A debounced version of the input function.
 *
 * Example:
 * const log = debounce(() => console.log('Hi'), 100);
 * log(); // waits 100ms, then logs 'Hi'
 * log(); // resets the timer if called again within 100ms
 */
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    if (timeout) {
      cancelAnimationFrame(timeout);
    }

    timeout = requestAnimationFrame(() => {
      setTimeout(() => func.apply(this, args), delay);
    });
  };
}

const hideHoverCard = debounce(() => {
  if (!isHoveringCard && !isHoveringEvent) {
    $('#hover-card').addClass('hide');
  }
}, 50); // Adjust delay as needed

$('#hover-card').on('mouseenter', function() {
  isHoveringCard = true;
}).on('mouseleave', function() {
  isHoveringCard = false;
  hideHoverCard();
});

$('#event-schedule-content-container, #schedule-section').on('click', '.add-to-schedule', function(e) {
  e.preventDefault();
  e.stopPropagation();
  if (acctId == 0) {
    // Redirect to signin
    window.location.href = '/users/?ref=' + window.location.pathname + window.location.search.replace('&', '|');
  } else {
    // Save session
    toggleSaveSession($(this).data('session'));
  }
});

$('#event-schedule-content-container, #schedule-section').on('click', '.get-tickets', function(e) {
  e.preventDefault();
  e.stopPropagation();
});

//List view
function buildScheduleListView() {
  //Reset
  $('#event-schedule-error').html('');

  // Destroy FullCalendar instance to prevent it from re-rendering into the list view container
  if (fullcalendarObj) {
    fullcalendarObj.destroy();
    fullcalendarObj = null;
  }
  
  //Variables
  let html = '';

  //Build
  if (!scheduleList.success) {
    $('#event-schedule-error').html(scheduleList.err_msg);

    return false;
  }

  //Setup
  html = '';
  if (!$('#schedule-list-top').length || !$('#schedule-list-body').length) {
    html += '<div id="schedule-list-top" class="col-12 flex overflow-hidden-x"></div>';
    html += '<div id="schedule-list-body" class="col-12 white rounded-big overflow-x-scroll"></div>';
    $('#event-schedule-content').html(html);
  }
  
  // Render selectable dates
  const headerResult = renderScheduleDateSelectors(scheduleList.all_sessions);
  let headerHtml = '';
  $.each(headerResult, function(i,v) {
    headerHtml += `<div class="schedule-day-btn flex flex-row justify-center items-center rounded-big mr-half ${(v.selected ? 'selected' : '')}" data-time_limit_min="${v.time_limit_min}" data-time_limit_max="${v.time_limit_max}" data-date_group="${v.date_group}">${v.date_group_full}</div>`;
  });
  $('#event-schedule-content #schedule-list-top').html(headerHtml);

  //Body
  html = '';
  if (baseValidateArray(scheduleList.all_sessions, 'length')) {
    // filter before passing to the render function
    const filteredList = Object.fromEntries(
      Object.entries(scheduleList.all_sessions).filter(([key, session]) => {
        return checkFilterValues(session) && eventOccursOnDate(session);
      })
    );

    html = renderListView(filteredList);
  } else {
    html = [
      `<div class="flex flex-wrap width-full height-full items-center justify-center" style="height: 150px;">
        <div class="col-12 flex flex-wrap justify-center">
          <div class="col-12 text-center mt2 px2 size-16">
            There are no sessions${scheduleList.all_sessions.length == 0 ? '' : ' matching the search term'}
          </div>
        </div>
      </div>`
    ];
  }
  domDisableLoader($('#event-schedule-content #schedule-list-body'), html.join(""), false, false, 'rgba(255,255,255,0)', '#0ABAB5', 20, 20);
  
  //Actions
  buildScheduleActions();
}

function groupSessionsByHour(sessionList) {
  let hourBlocks = {};
  const selectedDate = new Date($('.schedule-day-btn.selected').data('date_group') + "T00:00:00");

  Object.values(sessionList).flat().forEach(session => {
    let date = new Date(session.start_calendar);
    let hourKey = date.getHours(); // Extract hour (24-hour format)

    const isSameDay = (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );

    // Group under 12:00 AM if not the same day.
    // This implies it's carrying over from the previous date
    if (!isSameDay) {
      hourKey = 0; 
    }
    
    if (!hourBlocks[hourKey]) {
      hourBlocks[hourKey] = [];
    }

    hourBlocks[hourKey].push(session);
  });

  return hourBlocks;
}

function renderListView(data) {
  let groupedEvents = groupSessionsByHour(data);
  let scheduleHTML = []; //Using array for performance

  Object.keys(groupedEvents).sort((a, b) => Number(a) - Number(b)).forEach(hour => {
      let formattedHour = (parseInt(hour) % 12 || 12) + ":00" + (parseInt(hour) < 12 ? "am" : "pm");
      let eventHTML = ``;

      const sortedSessions = groupedEvents[hour].sort((a, b) => {
        if (a.start_time - b.start_time !== 0) {
          return a.start_time - b.start_time; // Primary: start_time ascending
        }
      
        // Secondary: end_time ascending
        return a.end_time - b.end_time;
      });

      eventHTML = sortedSessions.map(session => 
          buildListViewRow(session)
      ).join("");

      scheduleHTML.push(`
        <div class="hour-block">
          <div class="hour-block-header">
            <span class="hour-block-title">${formattedHour}</span>
            <span class="hour-block-divider"></span>
          </div>
          ${eventHTML}
        </div>
        `);
  });
  return scheduleHTML;
}

function buildListViewRow(session) {
  // Check if the session runs overnight, if so, show month + date + time
  const startCalendar = new Date(session.start_calendar);
  const endCalendar = new Date(session.end_calendar);

  const startDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(startCalendar);
  const startTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(startCalendar);
  const endDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(endCalendar);
  const endTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(endCalendar);
  const isOvernight = startDate !== endDate;
  
  let dateTimeText = startTime + ((baseValidateNumber(session.hide_end_time, 'positive') && session.hide_end_time == 1) ? '' : ' - ' + endTime);

  if (isOvernight) {
    dateTimeText = `${startDate} ${startTime} - ${endDate} ${endTime}`;
  }

  let addToScheduleText = '';
  //Initial state for save:
  if (session.user_saved == 1) {
    addToScheduleText = `<i class="uis uis-heart"></i>Added to my schedule`;
  } else {
    addToScheduleText = `<i class="uil uil-heart"></i>Add to my schedule`;
  }

  let html = `
    <div class="schedule-item col-12 flex flex-wrap mt1 p2 xs-p1 ${session.status === 'cancelled' ? 'session-cancelled' : ''}" style="background-color: #FFF; border: 1px solid #C4CAC9;" data-id="${session.id}" data-view-type="list">
      <span class="session-dot col-1 mr-half" style="background-color: ${session.background_color};"></span>
      <div class="col-7 xs-col-11 flex flex-wrap pr2">
        <div class="col-12 flex items-center mb-half">
          <div class="schedule-title">${session.title}</div>
        </div>
        <div class="schedule-time col-12" style="font-weight: 400;">
          ${dateTimeText}
        </div>
      </div>
      <div class="col-4 xs-col-12 flex flex-wrap xs-mt-half">
  `;

  if (baseValidateString(session.location, 'length')) {
    html += `
        <div class="col-12 xs-col-6 flex items-center mb-half xs-mb0">
          <div class="schedule-location">
            <i class="uis uis-map-marker mr-half" style="color: #9D9D9F;"></i>${session.location}
          </div>
        </div>
    `;
  }

  if (session.track_id > 0 && activeTracks[session.track_id]) {
    html += `
        <div class="col-12 xs-col-6 flex items-center mt-half xs-mt0">
          <div class="schedule-track">
            <i class="uis uis-label mr-half" style="color: #9D9D9F;"></i>${activeTracks[session.track_id]['title']}
          </div>
        </div>
    `; 
  }

  let ticketText = '';
  if (
    session.status !== 'cancelled'
    && session.access_key?.length > 0
  ) {
    ticketText = `
        <div class="get-tickets size-12 ml2 mt-half">
          <a href="/events/ticket/?id=${eventId}&custom=${session.access_key}" class="text-secondary-2" target="_blank">Get tickets now <i class="uil uil-arrow-up-right"></i></a>
        </div>
    `;
  }

  html += `</div>`;
  if (session.status !== 'cancelled') {
    html += `
        <div class="flex col-12">
          <div class="add-to-schedule size-12 text-secondary-2 mt-half" data-session="${session.id}">
            ${addToScheduleText}
          </div>
          ${ticketText}
        </div>`
  }
  html += `</div>`;

  return html;
}

function buildSchedulePrintContent() {
  const grouped = {};

  const filteredList = [];

  $.each(scheduleList.all_sessions, function(i,v) {
    if (checkFilterValues(v)) {
      filteredList.push(v);
    }
  });
  
  // Group sessions by date
  filteredList.forEach(session => {
    const start = new Date(session.start_calendar);
    const end = new Date(session.end_calendar);

    // Start from midnight of the start date
    //  Subtracting 1 because JS indexes months from 0 to 11
    let currentDay = start.setHours(0, 0, 0, 0);
    let endDay = end.setHours(0, 0, 0, 0);
    
    while (currentDay <= endDay) {
      const currentDayDate = new Date(currentDay);
      const dateKey = currentDayDate.getFullYear() + '-' + String(currentDayDate.getMonth() + 1).padStart(2, '0') + '-' + String(currentDayDate.getDate()).padStart(2, '0');

      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(session);
  
      // Move to the next day
      currentDay += 86400000; // Add a day
    }
  });

  // Sort sessions within each date group by 'start_time' ASC
  for (let key in grouped) {
    if (grouped.hasOwnProperty(key)) {
      grouped[key].sort((a, b) => a.start_time - b.start_time);
    }
  }

  // Build print content
  const $container = $('#schedule-printable-area');
  $container.empty().append('<h1 style="margin-bottom: 8px;">Schedule</h1>');

  Object.keys(grouped).sort().forEach(date => {
    const daySessions = grouped[date];

    // Format to Day, Mon Date, Year
    const datePrint = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

    // Build table container
    $container.append(`<h2>${datePrint}</h2>`);
    const $table = $(`
      <table style="margin-bottom: 30px; width: 100%; border-collapse: collapse; border-spacing: 0;">
        <thead>
          <tr style="border-bottom: 2px solid black;">
            <th style="padding: 8px; text-align: left;">Session name</th>
            <th style="padding: 8px; text-align: left;">Start</th>
            <th style="padding: 8px; text-align: left;">End</th>
            <th style="padding: 8px; text-align: left;">Location</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `);

    // Print each session for the day
    daySessions.forEach(session => {
      const startTime = new Date(session.start_calendar);
      const endTime = new Date(session.end_calendar);

      // Get hours and minutes
      let startHours = startTime.getHours(); // 0-23
      const startMinutes = String(startTime.getMinutes()).padStart(2, '0');
      const startPeriod = startHours >= 12 ? 'PM' : 'AM';
      const startMonthShort = startTime.toLocaleString('en-US', { month: 'short' }); // e.g., "Sep"

      startHours = startHours % 12;
      startHours = startHours ? startHours : 12;

      // Get hours and minutes
      let endHours = endTime.getHours(); // 0-23
      const endMinutes = String(endTime.getMinutes()).padStart(2, '0');
      const endPeriod = endHours >= 12 ? 'PM' : 'AM';
      const endMonthShort = endTime.toLocaleString('en-US', { month: 'short' }); // e.g., "Sep"

      endHours = endHours % 12;
      endHours = endHours ? endHours : 12;

      let startTimeString = `${startHours}:${startMinutes} ${startPeriod}`;
      let endTimeString = `${endHours}:${endMinutes} ${endPeriod}`;

      // Check if session starts and ends on different days
      if (startTime.monthNumber != endTime.monthNumber || startTime.dayOfMonth != endTime.dayOfMonth) {
        startTimeString = `<span class="mr-half">${startMonthShort} ${startTime.getDate()}</span> ${startTimeString}`;
        endTimeString = `<span class="mr-half">${endMonthShort} ${endTime.getDate()}</span> ${endTimeString}`;
      }
  
      $table.find('tbody').append(`
        <tr style="border-bottom: 1px solid #ccc;">
          <td style="padding: 8px;">${session.title}</td>
          <td style="padding: 8px;">${startTimeString}</td>
          <td style="padding: 8px;">${session.hide_end_time == 0 ? endTimeString : ''}</td>
          <td style="padding: 8px;">${session.location}</td>
        </tr>
      `);
    });

    $container.append($table);
  });
}

$('#print-schedule').on('click', function(e) {
  const area = document.getElementById('printable-area');
  const parent = area.parentNode;
  const nextSibling = area.nextSibling;

  document.body.appendChild(area);

  function restore() {
    if (nextSibling) {
      parent.insertBefore(area, nextSibling);
    } else {
      parent.appendChild(area);
    }
    window.removeEventListener('afterprint', restore);
  }

  window.addEventListener('afterprint', restore);
  window.print();
});

function buildSelectableList(items) {
  let multiSelectList = {};
  if (typeof items == 'object') {
    multiSelectList = Object.values(items).reduce((acc, item) => {
      acc[item.id] = [item.title];
      return acc;
    }, {});
  } else {
    multiSelectList = items.reduce((acc, item) => {
      acc[item.id] = [item.title];
      return acc;
    }, {});
  }
  
  return multiSelectList;
}
