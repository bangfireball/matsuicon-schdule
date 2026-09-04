
/*---- Variables ----*/
let actionMenuVisible = false, 
    activeSessionId = 0,
    fullcalendarObj, 
    isHoveringCard = false,
    isHoveringEvent = false,
    session = {}, 
    savedSessions = {}, 
    scheduleAvailableTagsArr = [],
    scheduleList = {};

//Track variables
let trackDeletionData=[],
    activeTracks = [],
    allTracks = [],
    trackOrder = [],
    trackSummary = [];

//Type variables
let allTags = [];

//Filters
let locationFilter = '',
    typeFilter = '',
    trackFilter = '',
    statusFilter = [],
    guestFilter = [],
    scheduleViewGroup = 'event',
    searchTerm = '';

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 
      viewTypeArray = {
          resourceTimeGridDay: 'Day', 
          listWeek: 'List'
      };

$(document).on('click', function(e) {
  $('#schedule-filter-menu').addClass('hide');

  //Close view type dropdowns
  $('.link-dropdown-content').addClass('hide');

  //Close option dropdown
  $('.option-dropdown-menu').addClass('hide');

  //Close session delete dropdown
  $('.session-option-dropdown').each(function(i,v) {
    if (!$(v).hasClass('hide')) {
      $(v).addClass('hide');
    }
  });
});

/**
 * Session detail sidepanel START
 */
$('#session-detail-modal #session-detail-modal-close-btn').on('click', function(e) {
  e.preventDefault();
  $('body').removeClass('noscroll');
  $('#session-detail-modal').addClass('hide');
  // Remove video to prevent playing sound after closing the side panel
  $('#session-detail-modal .session-video-content').text('');
});
/**
 * Session detail sidepanel END
 */

/*---- Search ----*/
$('#schedule-search-input').on('keyup', function() {
  isDateGroupSetup = 0;

  searchTerm = $(this).val();

  if (searchTerm.length > 0) {
    $('#schedule-search-close').removeClass('hide');
  } else {
    $('#schedule-search-close').addClass('hide');
  }

  buildScheduleViewSelector();
});

$('#schedule-search-close').on('click', function() {
  $('#schedule-search-input').val('');
  searchTerm = '';

  $('#schedule-search-close').addClass('hide');
  buildScheduleViewSelector();
});

/*---- Options ----*/
//Share
$('#share-btn').on('click', function(e) {
  e.preventDefault();
  eleOpenShareModal($(this).data('href'));
});

$('.link-dropdown-btn').on('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  const viewType = $(this).data('view-type');

  //Close any other open dropdown
  $(`.link-dropdown-content:not([data-view-type="${viewType}"])`).addClass('hide');

  $(`.link-dropdown-content[data-view-type="${viewType}"]`).toggleClass('hide');
});

//Change public/private view (ONLY ON EO DASHBOARD GUEST DETAIL PAGE)
document.getElementById('access-type-filter')?.addEventListener('change', function() {
  const val = this.getSelected();
  visibilityFilter = (val === 'all') ? '' : val;
  $('#schedule-filter-visibility div[data-value]').removeClass('active');
  $(`#schedule-filter-visibility div[data-value="${visibilityFilter}"]`).addClass('active');
  buildScheduleViewSelector();
});

//Change session view type (list/day view)
document.getElementById('session-view-group')?.addEventListener('change', function() {
  scheduleViewType = this.getSelected();
  buildScheduleViewSelector();
});

//Change public/private view
document.getElementById('session-schedule-group')?.addEventListener('change', function() {
  const newValue = this.getSelected();
  if (newValue === scheduleViewGroup) return;

  if (newValue === 'personal' && acctId == 0) {
    window.location.href = '/users/?ref=' + window.location.pathname + window.location.search.replace('&', '|');
    return;
  }

  scheduleViewGroup = newValue;
  isDateGroupSetup = 0;
  timeLimitMin = '';
  timeLimitMax = '';
  getFilteredSessions();
});

/*---- Modal ----*/
//Build session detail modal
function buildSessionDetailModal() {
  // Variables
  const overview = session.schedule.overview,
        track = session.schedule.track,
        types = session.schedule.tags,
        orgTickets = session.schedule.tickets,
        guests = (session.schedule.guests || []).filter(g => g.status === 'confirmed');

    const link = `https://www.eventeny.com/events/${eventLink}/?action=schedule_item&action_ops[item_id]=${overview.id}`;
  //   timeDiff = timeDifference(overview.start_time, overview.end_time);

  // Update image
  if (overview.pic_600) {
    $('#session-detail-modal .session-cover-image').html(`
      <img src="/event-pics/${overview.pic_600}" alt="Session cover image" class="width-full height-full">  
    `);
  } else {
    // Default event image
    $('#session-detail-modal .session-cover-image').html(`
      <img src="${session.schedule.event.cover_600.length > 0 ? '/event-pics/' + session.schedule.event.cover_600 : '/images/homepage/evee-events-2025.png'}" alt="Session cover image" class="width-full height-full" />
    `);
  }

  // Update title
  $('#session-detail-modal .session-title').text(overview.title);

  // Update description
  if (overview.description.length > 0) {
    $('#session-detail-modal .session-description-content').text(overview.description).removeClass('hide');
    $('#session-detail-modal .session-description').removeClass('hide');
  } else {
    $('#session-detail-modal .session-description-content').text('');
    $('#session-detail-modal .session-description').addClass('hide');
  }

  // Update date & time
  let dateText;
  if (overview.hide_end_time == 1) {
    dateText = `${overview.start_date_full}, ${overview.start_min}`;
  } else if (overview.start_date == overview.end_date) {
    dateText = `${overview.start_date_full}, ${overview.start_min}  -  ${overview.end_min}`;
  } else {
    dateText = `${overview.start_date_full}, ${overview.start_min}  -  ${overview.end_date_full}, ${overview.end_min}`;
  }

  // Encode uri
  let uriTitle = encodeURIComponent(overview.title + ' via Eventeny'),
      uriDate = `${encodeURIComponent(overview.start_google_calendar)}/${encodeURIComponent(overview.end_google_calendar)}`,
      uriTimezone = encodeURIComponent(event.timezone),
      uriLocation = encodeURIComponent(overview.location.length > 0 ? overview.location : ''),
      uriDescription = `${encodeURIComponent(overview.description)}<br /><br />${encodeURIComponent(link)}`;

  // Create calendar link
  $('#session-detail-modal .session-date-time-content').html(`
    ${dateText} 
    <i id="session-detail-modal-calendar-btn" class="uil uil-calendar-alt text-secondary-2 pointer size-20" data-href="https://www.google.com/calendar/render?action=TEMPLATE&text=${uriTitle}&dates=${uriDate}&ctz=${uriTimezone}&location=${uriLocation}&details=${uriDescription}"></i>
  `);

  // Update location
  if (overview.location.length > 0) {
    $('#session-detail-modal .session-location-content').text(overview.location).removeClass('hide');
    $('#session-detail-modal .session-location').removeClass('hide');
  } else {
    $('#session-detail-modal .session-location-content').text('');
    $('#session-detail-modal .session-location').addClass('hide');
  }

  // Update status
  if (overview.status == 'active') {
    $('#session-detail-modal .session-status-content').html(`
      <span class="pill active">
        Active
      </span>
    `);
  } else {
    $('#session-detail-modal .session-status-content').html(`
      <span class="pill cancelled">
        Cancelled
      </span>
    `);
  }

  // Update video
  if (overview.av_link.length > 0) {
    let videoHtml = ``;
    switch(overview.av_type) {
      case 'youtube': 
        videoHtml += `
            <div class="relative height-full width-full">
              <iframe class="block height-full width-full video-screen-size" src="https://www.youtube.com/embed/${overview.av_link_id}?autoplay=0&loop=1&modestbranding=1&shuffle=1&rel=0&version=3" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
        break;
  
      case 'youtube-playlist':
        videoHtml += `
            <div class="relative height-full width-full">
              <iframe class="block height-full width-full video-screen-size" src="https://www.youtube.com/embed/videoseries?list=${overview.av_link_id}&autoplay=0&loop=1&modestbranding=1&shuffle=1&rel=0&version=3" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
        break;
  
      case 'facebook':
        videoHtml += `
            <iframe class="block height-full width-auto mx-auto video-screen-size video-screen-size-fb" src="https://www.facebook.com/plugins/video.php?href=${overview.av_link_id}&show_text=0" scrolling="no" frameborder="0" allowTransparency="true" allowFullScreen="true"></iframe>
        `;
        break;
  
      case 'vimeo':
        videoHtml += `
            <div class="width-full" style="padding:56.56% 0 0 0;position:relative;">
              <iframe src="https://player.vimeo.com/video/${overview.av_link_id}?autoplay=0&color=0abab5&title=0&byline=0&portrait=0" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>
        `;
        break;
  
      case 'twitch':
        videoHtml += `
            <div class="width-full" style="padding:56.56% 0 0 0;position:relative;">
              <iframe src="https://player.twitch.tv/?channel=${overview.av_link_id}&parent=www.eventeny.com&autoplay=true" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" scrolling="no" allowfullscreen="allowfullscreen""></iframe>
            </div>
        `;
        break;
  
      case 'zoom':
        videoHtml += `
            <div class="width-full overflow-hidden relative" style="padding-top: 105%;">
              <iframe allow="microphone; camera" class="height-full absolute all-0 width-full rounded-big" style="border: 0;" src="/ele/zoom/?meeting_number=${overview.av_link_id}&password=${overview.av_password}&event_id=${eventId}&username=${(baseValidateString(user.first_name, 'length') ? user.first_name : '') + ((baseValidateString(user.first_name, 'length') && baseValidateString(user.last_name, 'length')) ? ' ' : '') + (baseValidateString(user.last_name, 'length') ? user.last_name : '')}&useremail=${(baseValidateString(user.email, 'length') ? user.email : '')}" frameborder="0" allowfullscreen="allowfullscreen"></iframe>
            </div>
            <div class="text-center mt2"
              <div class="strong">Having technical issues?</div>
              <a href="https://zoom.us/j/${overview.av_link_id + (baseValidateString(overview.av_password, 'length') ? '?pwd=' + overview.av_password : '')}" target="_blank" class="btn btn-small">
                <i class="material-icons mr-half">open_in_new</i>
                Click to open in external browser
              </a>
            </div>
        `;
        break;
    }
    $('#session-detail-modal .session-video-content').html(videoHtml).removeClass('hide');
    $('#session-detail-modal .session-video').removeClass('hide');
  } else {
    $('#session-detail-modal .session-video-content').text('');
    $('#session-detail-modal .session-video').addClass('hide');

  }

  // Update track
  if (track.length > 0) {
    $('#session-detail-modal .session-track-content').html(track[0].title).removeClass('hide');
    document.querySelector('#session-detail-modal .session-track-content').style.backgroundColor = `${track[0].color}20`;
    $('#session-detail-modal .session-track').removeClass('hide');
  } else {
    $('#session-detail-modal .session-track-content').text('');
    $('#session-detail-modal .session-track').addClass('hide');
  }

  // Update types
  if (types.length > 0) {
    let typesHtml = ``;
    $.each(types, function(i,v) {
      typesHtml += `
        <span class="tag-25 stronger text-gray-9D">
          ${v.title}
        </span>
      `;
    });

    $('#session-detail-modal .session-types-content').html(typesHtml).removeClass('hide');
    $('#session-detail-modal .session-types').removeClass('hide');
  } else {
    $('#session-detail-modal .session-types-content').text('');
    $('#session-detail-modal .session-types').addClass('hide');
  }

  // Update tickets
  if (orgTickets['tickets']?.length > 0) {
    const tickets = orgTickets['tickets'];

    let ticketsHtml = ``;

    $.each(tickets, function(i,v) {
      ticketsHtml += `
        <span class="tag-25 stronger text-gray-9D">
          ${v.ticket_name}
        </span>
      `;
    });

    $('#session-detail-modal .session-tickets-content').html(ticketsHtml).removeClass('hide');
    $('#session-detail-modal .session-tickets').removeClass('hide');
  } else {
    $('#session-detail-modal .session-tickets-content').text('');
    $('#session-detail-modal .session-tickets').addClass('hide');
  }

  // Update add ons
  if (orgTickets['addons']?.length > 0) {
    const addOns = orgTickets['addons'];
    let addOnsHtml = ``;
    
    $.each(addOns, function(i,v) {
      addOnsHtml += `
        <span class="tag-25 stronger text-gray-9D">
          ${v.ticket_name}
        </span>
      `;
    });

    $('#session-detail-modal .session-add-ons-content').html(addOnsHtml).removeClass('hide');
    $('#session-detail-modal .session-add-ons').removeClass('hide');
  } else {
    $('#session-detail-modal .session-add-ons-content').text('');
    $('#session-detail-modal .session-add-ons').addClass('hide');
  }

  // Update guests
  if (guests.length > 0) {
    let guestsHtml = ``;
    $.each(guests, function(i,v) {
      guestsHtml += `
        <div class="col-4 flex flex-wrap justify-around text-center mb2">
          <img src="/${v.image.length > 0 ? ('event-pics/' + v.image) : 'images/evee/evee-profile-circle.png'}" class="col-12" style="width: 150px; height: 150px; border-radius: 150px; border: 0.5px solid gray;">
          </img>
          <span class="col-12 mt2">${GuestUtils.resolveDisplayName(v)}</span>
        </div>
      `;
    });
    $('#session-detail-modal .session-guests-content').html(guestsHtml).removeClass('hide');
    $('#session-detail-modal .session-guests').removeClass('hide');
  } else {
    $('#session-detail-modal .session-guests-content').text('');
    $('#session-detail-modal .session-guests').addClass('hide');
  }

  $('body').addClass('noscroll');
  $('#session-detail-modal').removeClass('hide');
}

$('#session-detail-modal').on('click', '#session-detail-modal-calendar-btn', function(e) {
  e.preventDefault();
  window.open($(this).data('href'));
});

/*---- Actions ----*/
//Schedule section
$('#schedule-section').on('click', function() {
  if (!$('#schedule-filter-menu').hasClass('hide')) {
    $('#schedule-filter-menu').addClass('hide');
  }
});

//Schedule detail modal
$('#schedule-detail-modal').on('click', function(e) {
  e.preventDefault();
  $('#event-schedule-content #schedule-list-body .schedule-item').removeClass('selected');
  baseRightModalManager('#schedule-detail-modal', 250, 'close');
  $('#schedule-detail-modal-content').html('');
});

//Filter
$('#schedule-filter-btn').on('click', function(e) {
  e.preventDefault();
  e.stopPropagation();

  //Close view type dropdowns
  $('.link-dropdown-content').addClass('hide');

  // Open side-panel
  $('#session-filter-side-panel').removeClass('hide');
  $('body').addClass('noscroll');
});

$('#session-filter-side-panel-close-btn').on('click', function(e) {
  $('#session-filter-side-panel').addClass('hide');
  $('body').removeClass('noscroll');
});

//AJAX Actions
function buildScheduleActions() {
  //Schedule day button
  $('#event-schedule-content #schedule-list-top .schedule-day-btn').off('click');
  $('#event-schedule-content #schedule-list-top .schedule-day-btn').on('click', function(e) {
    e.preventDefault();
    if (!$(this).hasClass('selected')) {
      domDisableLoader($('#event-schedule-content #schedule-list-body'), '', true, true, 'rgba(255,255,255,0)', '#0ABAB5', 20, 20);
      $('#event-schedule-content #schedule-list-top .schedule-day-btn').removeClass('selected');
      $(this).addClass('selected');
      buildScheduleViewSelector();

      const leftPos = $(this).parent().scrollLeft() + $(this).position().left;
      $(this).parent().animate({
        scrollLeft: Math.max(leftPos - 100, 0)
      }, 250);
    }
  });

  //Schedule item
  $('#event-schedule-content #schedule-list-body .schedule-item').off('click');
  $('#event-schedule-content #schedule-list-body .schedule-item').on('click', function(e) {
    if ($(e.target).closest('.add-to-schedule').length) {
      // Click came from the button — ignore
      return;
    }
    window.open(`/events/schedule/?id=${eventId}&session=${$(this).data('id')}`, '_blank');
  });
  
  //Schedule modal share
  $('#session-detail-modal #session-detail-modal-share-btn').off('click');
  $('#session-detail-modal #session-detail-modal-share-btn').on('click', function(e) {
    e.preventDefault();
    eleOpenShareModal($(this).data('href'));
  });

  // Schedule link copy
  $('#session-detail-modal [data-action="copy"]').off('click');
  $('#session-detail-modal [data-action="copy"]').on('click', function(e) {
    e.preventDefault();
    let $temp = $('<input>');
    $('body').append($temp);
    $temp.val($(this).attr('data-copy')).select();
    document.execCommand('copy');
    $temp.remove();
  });
  
  //Schedule modal google calendar
  $('#schedule-detail-modal #schedule-detail-modal-calendar-btn').off('click');
  $('#schedule-detail-modal #schedule-detail-modal-calendar-btn').on('click', function(e) {
    e.preventDefault();
    window.open($(this).data('href'));
  });
  
  //Schedule modal view map
  $('#schedule-detail-modal #schedule-detail-modal-map-btn').off('click');
  $('#schedule-detail-modal #schedule-detail-modal-map-btn').on('click', function(e) {
    e.preventDefault();
    window.open($(this).data('href'));
  });
    
  //Schedule modal ticket button
  $('#schedule-detail-modal #schedule-detail-modal-ticket-btn').off('click');
  $('#schedule-detail-modal #schedule-detail-modal-ticket-btn').on('click', function(e) {
    e.preventDefault();
    window.open($(this).data('href'));
  });
}

/*---- Initialization ----*/
document.addEventListener('DOMContentLoaded', () => {
  // Populate the session-view-group dropdown
  const $sessionViewGroupDropdown = document.getElementById('session-view-group');
  if ($sessionViewGroupDropdown && typeof $sessionViewGroupDropdown.setItems === 'function') {
    const initialView = $sessionViewGroupDropdown.dataset.initialView || 'listWeek';
    $sessionViewGroupDropdown.setItems([
      { id: 'listWeek', value: 'List view' },
      { id: 'resourceTimeGridDay', value: 'Day view' }
    ]);
    $sessionViewGroupDropdown.selected = initialView;
    $sessionViewGroupDropdown.setSelected(initialView);
  }

  // Populate the session-schedule-group dropdown (non-admin, non-shared pages only)
  const $sessionScheduleGroup = document.getElementById('session-schedule-group');
  if ($sessionScheduleGroup && typeof $sessionScheduleGroup.setItems === 'function') {
    $sessionScheduleGroup.setItems([
      { id: 'event', value: 'Event schedule' },
      { id: 'personal', value: 'My schedule' }
    ]);
    $sessionScheduleGroup.selected = 'event';
    $sessionScheduleGroup.setSelected('event');
  }

  // Populate the access-type-filter dropdown (admin pages only)
  const $accessTypeFilterDropdown = document.getElementById('access-type-filter');
  if ($accessTypeFilterDropdown && typeof $accessTypeFilterDropdown.setItems === 'function') {
    $accessTypeFilterDropdown.setItems([
      { id: 'all', value: 'Public & private view' },
      { id: 'public', value: 'Public view' },
      { id: 'private', value: 'Private view' }
    ]);
    $accessTypeFilterDropdown.selected = 'all';
    $accessTypeFilterDropdown.setSelected('all');
  }

  // Wire up the guest session picker modal (guest detail pages only)
  const modal = document.getElementById('edit-guest-sessions-modal');
  if (modal && typeof initGuestSessionModalPicker === 'function') {
    initGuestSessionModalPicker({
      guestId:   parseInt(modal.dataset.guestId),
      eventId:   parseInt(modal.dataset.eventId),
      acctId:    parseInt(modal.dataset.acctId),
      route:     '/funcs/dashboard/guest-management/GuestConnectionRoute.php',
      sessRoute: '/funcs/dashboard/events/programming/SessionRoute.php',
      onSave:    typeof getFilteredSessions === 'function' ? () => {
        // Reset date filter so all sessions are re-fetched after save
        if (typeof timeLimitMin !== 'undefined') timeLimitMin = '';
        if (typeof timeLimitMax !== 'undefined') timeLimitMax = '';
        if (typeof isDateGroupSetup !== 'undefined') isDateGroupSetup = 0;
        return getFilteredSessions();
      } : null
    });
  }
});

/*---- Calculations ----*/
//Time difference
function timeDifference(startTime, endTime) {
  const timeDiff = endTime - startTime;
  return {
    day: Math.floor(timeDiff / 86400), 
    hour: Math.floor((timeDiff % 86400) / 3600), 
    minute: Math.floor((timeDiff % 3600) / 60), 
    second: Math.floor(timeDiff % 60),
  };
}

/*---- Timezone Offset ----*/
const getEstOffset = (date) => {
  const stdTimezoneOffset = () => {
    let d = new Date();
    let jan = new Date(d.getFullYear(), 0, 1),
      jul = new Date(d.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  };
  let d = new Date(Date.parse(date));
  return d.getTimezoneOffset() < stdTimezoneOffset() ? 'GMT-0400' : 'GMT-0500';
};