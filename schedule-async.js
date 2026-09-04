//Note:
// Sessions refer to each item within a schedule
// Schedule refers to the set of sessions

/*---- Sessions ----*/
async function getFilteredSessions() {
  showLoader();
  hideError('#schedule-section');

  const params = new FormData();
  params.append('post_type', 'fetch_filtered_list');
  params.append('view_group', scheduleViewGroup);
  params.append('time_limit_min', timeLimitMin);
  params.append('time_limit_max', timeLimitMax);
  params.append('event_id', eventId);
  params.append('acct_id', acctId);
  params.append('search', searchTerm.toLowerCase());
  params.append('visibility_filter', visibilityFilter);
  params.append('status_filter', statusFilter ?? '');
  params.append('track_filter', trackParamFilter);
  params.append('tag_filter', tagParamFilter);
  params.append('session_filter', sessionParamFilter);
  params.append('guest_filter', guestParamFilter ?? '');
  params.append('agent_filter', agentParamFilter ?? '');
  params.append('handler_filter', handlerParamFilter ?? '');
  params.append('location_filter', locationParamFilter ?? '');

  // flightFilter isn't declared on the public/embed schedule page
  params.append('flight_filter', (typeof flightFilter !== 'undefined' && flightFilter) ?? '');

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    scheduleList = data;

    // Re-render session multi select for sharing
    // Update data-set JSON
    $(`#share-embed-modal .multi-select-container[data-source="session"] .data-set`).text(JSON.stringify(Object.values(scheduleList.all_sessions)));

    // Update rows
    if ($(`#share-embed-modal .multi-select-container[data-source="session"] .data-set`).length > 0) {
      buildItemRows(JSON.parse($(`#share-embed-modal .multi-select-container[data-source="session"] .data-set`).text().trim()), 'session', '#share-embed-modal');
      
      // Reattach event listeners
      bindMultiDropdownFuncsToElements();
    }

    buildFilterOptions();
    if (typeof buildEmbedOptions === "function") buildEmbedOptions();
    buildScheduleViewSelector();
  } catch (error) {
    showError('#schedule-section', error);
  } finally {
    hideLoader();
  }
}

async function getSession(callback = buildSessionDetailModal) {
  hideError('#schedule-section');
  showLoader();

  const params = new FormData();
  params.append('post_type', 'fetch_session');
  params.append('id', activeSessionId);
  params.append('biz_id', eventBizId);
  params.append('event_id', eventId);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    session = data;
    savedSessions[`item-${activeSessionId}`] = data;
    
    if (callback) {
      callback();
    }
  } catch (error) {
    showError('#schedule-section', error.stack);
  } finally {
    hideLoader();
  }
}

async function updateSessionInfo(goNext = true, callback = null) {
  showLoader();
  hideError('#update-schedule-modal');

  const params = new FormData($('#session-information-form')[0]);
  params.append('post_type', 'update_session_info');
  params.append('event_id', eventId);
  params.append('acct_id', acctId);
  params.append('biz_id', eventBizId);
  params.append('hide_end_time', $('#session-information-form #hide-end-time').is(':checked') ? 1 : 0);
  params.append('tag_ids', $('#session-information-form .multi-select-container[data-source="type"] .selected-values').val());
  params.append('start_time', $('#session-information-form #start_time input').val() || '12:00');
  params.append('end_time', $('#session-information-form #end_time input').val() || '12:00');

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }
    
    activeSessionId = data.session_id;
    if (goNext) {
      //Show appropriate next forms
      $('#session-information-form').addClass('hide');
      $('#session-media-form').removeClass('hide');

      //Show back btn
      $('#update-session-back-btn, #update-session-back-btn-mobile').removeClass('hide');

      //Update next -> submit
      $('#update-session-next-btn').html(`<i class="uil uil-arrow-up"></i>Submit`);
      $('#update-session-next-btn-mobile').html(`Submit`);

      //Update stepper
      $('#update-session-next-btn').data('step', 2);
      $('#update-session-next-btn-mobile').data('step', 2);
      updateStepper(2, '#update-schedule-modal .error');
    } else {
      $('#update-schedule-modal-close-btn').click();
      activeSessionId = data.session_id;
      $('body').addClass('noscroll');
    }

    isDateGroupSetup = 0;
    await getFilteredSessions();

    fetchTracks();

    //If editing an existing session, remove it from the saved sessions
    // so it will be re-fetched
    if (savedSessions[`item-${activeSessionId}`]) {
      delete savedSessions[`item-${activeSessionId}`];
    }

    if (callback) {
      callback();
    }
  } catch (error) {
    showError('#update-schedule-modal', error);
  } finally {
    hideLoader();
  }
}

async function updateSessionMedia() {
  showLoader();
  hideError('#update-schedule-modal');

  const params = new FormData($('#session-media-form')[0]);
  params.append('post_type', 'update_session_media');
  params.append('session_id', activeSessionId);
  params.append('event_id', eventId);
  params.append('acct_id', acctId);
  params.append('guest_ids', $('#session-media-form .multi-select-container[data-source="guest"] .selected-values').val() ?? '');
  params.append('ticket_ids', $('#session-media-form .multi-select-container[data-source="ticket"] .selected-values').val() ?? '');
  params.append('add_on_ids', $('#session-media-form .multi-select-container[data-source="add-on"] .selected-values').val() ?? '');

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    //Show right screens
    if (isNewSession) {
      $('#session-media-form').addClass('hide');
      $('#session-complete-form').removeClass('hide');
  
      //Show right buttons
      $('#session-form-buttons, #session-form-buttons-mobile').addClass('hide');
      $('#session-complete-buttons').removeClass('hide');
  
      //Update stepper
      $('#update-session-next-btn, #update-session-next-btn-mobile').data('step', 3);
      updateStepper(3, '#update-schedule-modal .error');
      
      isDateGroupSetup = 0;

      await getFilteredSessions();

      return;
    }

    //If editing an existing session, remove it from the saved sessions
    // so it will be re-fetched
    if (savedSessions[`item-${activeSessionId}`]) {
      delete savedSessions[`item-${activeSessionId}`];
    }

    $('#update-schedule-modal .session-manage-btn-container').addClass('hide');

    // Refresh sessions and re-detect conflicts so resolved conflicts are cleared.
    isDateGroupSetup = 0;
    await getFilteredSessions();

    $('#check-session-btn').click();
  } catch (error) {
    showError('#update-schedule-modal', error);
  } finally {
    hideLoader();
  }
}

async function deleteSession(id) {
  hideError('#schedule-section');
  showLoader();

  const params = new FormData();
  params.append('post_type', 'delete_session');
  params.append('event_id', eventId);
  params.append('acct_id', acctId);
  params.append('id', id);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();
    
    if (!data.success) {
      throw data.err_msg;
    }

    delete scheduleList.raw_list[id];

    fetchTracks();

    //Rerender schedule items
    if (Object.keys(scheduleList.raw_list).length > 0) {
      // If session still exist for that day, just rebuild the view
      buildScheduleViewSelector();
    } else {
      // If no session left, refetch info
      $('.schedule-day-btn.selected').removeClass('selected');
      timeLimitMax = '';
      timeLimitMin = '';
      isDateGroupSetup = 0;
      getFilteredSessions();
    }

    const modal = document.querySelector('modal-element#remove-session-modal');
    modal.closeModal();
    $('.session-remove-cancel').click();
    $('#session-detail-modal-close-btn').click();

    $('#update-schedule-modal-close-btn').click();
  }
  catch (error) {
    showError('#schedule-section', error);
  }
  finally {
    hideLoader();
  }
}

async function toggleSaveSession(sessionId) {
  const params = new FormData();
  params.append('post_type', 'toggle_save_session');
  params.append('id', sessionId);
  params.append('acct_id', acctId);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();
    
    if (!data.success) {
      throw data.err_msg;
    }

    let active = data.active;

    // Update the button accordingly
    if (active == 0) {
      $(`.add-to-schedule[data-session="${sessionId}"]`).html(`<i class="uil uil-heart"></i>Add to my schedule`);
    } else {
      $(`.add-to-schedule[data-session="${sessionId}"]`).html(`<i class="uis uis-heart"></i>Added to my schedule`);
    }

    if (fullcalendarObj) {
      // Day view
      let sessionElement = fullcalendarObj.getEventById(sessionId);
      sessionElement.setExtendedProp('userSaved', active);
    }
  }
  catch (error) {
    showError('#session-detail', error);
  }
  finally {
    hideLoader();
  }
}

async function fetchSharedLinks() {
  hideError('#share-embed-modal');

  const params = new FormData();
  params.append('post_type', 'fetch_shared_links');
  params.append('child', 'schedule');
  params.append('event_id', eventId);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    const sharedLinks = data.shared_links;

    // Render list of shared links
    let html = '';
    if (sharedLinks.length > 0) {
      sharedLinks.forEach(link => {
        html += `
          <tr data-slug="${link.slug}">
            <td>
              <checkbox-element class="select-option link-select-option" data-source="share-link"></checkbox-element>
            </td>
            <td class="link-name-container">
              <input type="text" value="${link.name ?? ''}" class="hide">
              <span title="${link.name ?? ''}">${link.name ?? ''}</span>
            </td>
            <td>
              <span class="sharable-link" title="https://www.eventeny.com/share/?s=${link.slug}${eventId}">https://www.eventeny.com/share/?s=${link.slug}${eventId}</span>
            </td>
            <td class="password-container">
              <input type="text" value="${link.password ?? ''}" class="hide">
              <span data-pass="${link.password ?? ''}">${link.password ? '•'.repeat(10) : ''}</span>
              <i class="uil uil-eye pointer toggle-password-view ml2 ${link.password.length == 0 ? 'hide' : ''}"></i>
            </td>
            <td class="action-items-container">
              <div class="action-items">
                <i class="uil uil-copy copy-share-link text-secondary-2 pointer mr-half"></i>
                <i class="uil uil-pen share-link-edit-password text-secondary-2 pointer mx-half"></i>
                <i class="uil uil-trash-alt share-link-remove-password text-tertiary2 pointer ml-half"></i>
              </div>
              <div class="share-link-edit-confirmation-container hide">
                <i class="uil uil-check edit-confirm text-secondary-2 pointer mr-half"></i>
                <i class="uil uil-times edit-cancel text-tertiary2 pointer ml-half"></i>
              </div>
            </td>
            <td class="link-live-container">
              <label class="label-switch-23-grey-primary">
                <input type="checkbox" class="link-live" ${link.live == 1 ? 'checked' : ''} />
                <div class="checkbox link-live-toggle" style="top: -2px;"></div>
              </label>
            </td>
            <td class="remove-confirmation-container hide" colspan="2">
              <div class="size-16 strong text-primary-2">
                Are you sure <i class="uil uil-check remove-confirm pointer mr-half"></i> <i class="uil uil-times text-tertiary2 remove-cancel pointer ml-half"></i>
              </div>
            </td>
          </tr>
        `;
      });

      $('#share-embed-modal .share-embed-option[data-type="shared-links"]').removeClass('hide');
    } else {
      $('#share-embed-modal #share-embed-toggle .share-embed-option[data-type="share"]').click();
      $('#share-embed-modal .share-embed-option[data-type="shared-links"]').addClass('hide');
    }

    $('#share-embed-modal #shared-links tbody#shared-links-list').html(html);

  } catch (error) {
    showError('#share-embed-modal', error);
  } finally {
    hideLoader();
  }
}

async function shortenShareLink(path, name, password) {
  hideError('#share-embed-modal');

  const params = new FormData();
  params.append('post_type', 'shorten_share_link');
  params.append('acct_id', acctId);
  params.append('event_id', eventId);
  params.append('name', name);
  params.append('link', path);
  params.append('password', password);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    $('#share-embed-modal #share-link').val(data.short_link).removeClass('hide');

    const text = data.short_link;
    navigator.clipboard.writeText(text);
  
    $('#share-embed-modal #generate-share-link').text('Copied!').data('action', 'copy'); //change button text to Copied!
    
    setTimeout(function(){ //remove notification after 2 seconds
      $('#share-embed-modal #generate-share-link').text(`Copy link${password.length > 0 ? ' and password' : ''}`); //change button text back to Copy
    }, 2000);

    fetchSharedLinks();
  } catch (error) {
    showError('#share-embed-modal', error);
  }
}

async function updateShareLinkDetails(shareLinkDetails) {
  hideError('#shared-links');

  const params = new FormData();
  params.append('post_type', 'update_share_link_details');
  params.append('event_id', eventId);
  params.append('slug', shareLinkDetails.slug);
  params.append('name', shareLinkDetails.name);
  params.append('password', shareLinkDetails.password);
  params.append('is_live', shareLinkDetails.isLive);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    // Update the values in the table
    const $row = $(`#share-embed-modal #shared-links-list tr[data-slug="${shareLinkDetails.slug}"]`);

    $row.find('.link-name-container input').val(data.short_link_details.name).addClass('hide');
    $row.find('.link-name-container span').text(data.short_link_details.name);

    $row.find('.password-container input').val(data.short_link_details.password).addClass('hide');
    if (data.short_link_details.password.length > 0) {
      $row.find('.password-container span').text('•'.repeat(10)).data('pass', data.short_link_details.password);
      $row.find('.password-container i.toggle-password-view').removeClass('hide');
    } else {
      $row.find('.password-container span').text('').data('pass', '');
      $row.find('.password-container i.toggle-password-view').addClass('hide');
    }

    $row.find('.link-live input').prop('checked', data.short_link_details.live == 1 ? true : false);

    $(`#share-embed-modal tr[data-slug="${data.short_link_details.slug}"] .edit-cancel`).click();
  } catch (error) {
    showError('#shared-links', error);
  } finally {
    hideLoader();
  }
}

async function removeShareLinks(slugs) {
  showLoader();
  hideError('#shared-links');

  const params = new FormData();
  params.append('post_type', 'remove_share_links');
  params.append('event_id', eventId);
  params.append('slugs', slugs);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    $('#link-multi-remove-container').addClass('hide');

    if ($('.select-all-option[data-source="share-link"]')[0].isChecked()) {
      $('.select-all-option[data-source="share-link"]').prop('checked', false).trigger('click');
    }

    fetchSharedLinks();
  } catch (error) {
    showError('#shared-links', error);
  }
}


async function bulkImportSchedule(form) {
  showLoader();
  hideError('#bulk-schedule-modal');

  const params = new FormData(form);
  params.append('post_type', 'bulk_import_schedule');
  params.append('admin_acct_id', acctId ?? 0);
  params.append('event_id', eventId);
  params.append('biz_id', eventBizId);

  // If user solved conflicts in bulk-preview mode, submit the resolved preview rows
  // so backend imports edited times/guests instead of original file values.
  if (typeof ScheduleSessionUIStateService !== 'undefined') {
    const previewMap = ScheduleSessionUIStateService.getPreviewAllSessions?.();
    if (previewMap) {
      const getGuestIds = (session) => ScheduleSessionDataService.normalizeGuestList(session.guests)
        .map(g => String(g?.connect_id || g?.id || '').trim())
        .filter(Boolean);
      const guestSignature = (session) => getGuestIds(session).slice().sort().join(',');
      const existingSessions = scheduleList?.all_sessions || {};

      const hasChanges = (existing, s) =>
        existing.start_calendar !== s.start_calendar
        || existing.end_calendar !== s.end_calendar
        || guestSignature(existing) !== guestSignature(s)
        || (existing.location || '') !== (s.location || '')
        || Number(existing.location_id || 0) !== Number(s.location_id || 0);

      const buildPayload = (s) => ({
        start_calendar: s.start_calendar,
        end_calendar: s.end_calendar,
        guest_ids: getGuestIds(s),
        // Location edits made in the conflict panel live on the preview
        // session; without sending them the import would silently fall back
        // to the original file/DB value and the conflict would come back.
        location: typeof s.location === 'string' ? s.location : '',
        location_id: Number(s.location_id || 0),
      });

      // Send one unified payload:
      // - `preview_row` items update imported Excel rows (new sessions to be created)
      // - `session_id` items apply edits to already-existing sessions on final upload
      const previewRows = Object.values(previewMap)
        .map(s => {
          const id = String(s.id);
          if (id.startsWith('preview_')) {
            return { ...buildPayload(s), preview_row: Number(s.preview_row) };
          }
          const existing = existingSessions[id];
          if (!existing || !hasChanges(existing, s)) return null;
          return { ...buildPayload(s), session_id: Number(id) };
        })
        .filter(Boolean);

      if (previewRows.length > 0) {
        params.append('preview_sessions_json', JSON.stringify(previewRows));
        window.__bulkSchedulePreviewUploadPayload = previewRows;
      }
    }
  }

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });
  
  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    $('.schedule-day-btn.selected').removeClass('selected');

    isDateGroupSetup = 0;
    timeLimitMax = '';
    timeLimitMin = '';

    getFilteredSessions();
    await fetchTracks();
    await fetchTags('#session-information-form', 'schedule-tag', undefined, 'type');

    document.getElementById('bulk-schedule-modal')?.closeModal?.();
  } catch (error) {
    showError('#bulk-schedule-modal', error);
    hideLoader();
  }
}

async function bulkEditSchedule(form) {
  showLoader();
  hideError('#bulk-edit-form');

  const params = new FormData(form);
  params.append('post_type', 'bulk_edit_schedule');
  params.append('admin_acct_id', acctId ?? 0);
  params.append('event_id', eventId);
  params.append('biz_id', eventBizId);

  const request = new Request('/funcs/dashboard/events/programming/SessionRoute.php', {
    method: 'POST',
    body: params
  });
  
  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    window.location.reload();
  } catch (error) {
    showError('#bulk-edit-form', error);
    hideLoader();
  }
}

/*---- Tracks ----*/
async function fetchTracks(type = 'all') {
  showLoader();
  hideError('#track-form');

  const params = new FormData();
  params.append('post_type', 'fetch_tracks');
  params.append('biz_id', eventBizId);
  params.append('event_id', eventId);
  params.append('type', type);

  const request = new Request('/funcs/dashboard/events/programming/TrackRoutes.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    allTracks = data.tracks;
    activeTracks = data.active_tracks;
    trackSummary = data.track_summary;

    if (typeof buildTrackModal === "function") buildTrackModal();
  } catch (error) {
    showError('#track-form', error);
  } finally {
    hideLoader();
  }
}

async function updateTrack() {
  showLoader();
  hideError('#track-form');

  const params = new FormData($('#track-form')[0]);
  params.append('post_type', 'update_track');
  params.append('acct_id', acctId);
  params.append('biz_id', eventBizId);
  params.append('event_id', eventId);

  const request = new Request('/funcs/dashboard/events/programming/TrackRoutes.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    await fetchTracks();

    $('#cancel-create-track-btn').click();

    timeLimitMax = '';
    timeLimitMin = '';
    isDateGroupSetup = 0;
    getFilteredSessions();
  } catch (error) {
    hideLoader();
    showError('#track-form', error);
  }
}

async function reorderTracks(orderedTracks) {
  showLoader();
  hideError('#track-form');

  const params = new FormData();
  params.append('post_type', 'reorder_tracks');
  params.append('ordered_tracks', orderedTracks);
  params.append('event_id', eventId);

  const request = new Request('/funcs/dashboard/events/programming/TrackRoutes.php', {
    method: 'POST',
    body: params
  });

  try {

    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    await fetchTracks();

    timeLimitMax = '';
    timeLimitMin = '';
    isDateGroupSetup = 0;
    getFilteredSessions();
  } catch (error) {
    showError('#track-form', error);
  }
}

async function removeTracks(trackId = '') {
  showLoader();
  hideError('#track-form');

  let selectedIds = [];
  $('.track-checkbox:checked').each(function() {
    selectedIds.push($(this).data('track-id'));
  });

  const params = new FormData();
  params.append('post_type', 'remove_tracks');
  params.append('track_id', selectedIds.join(',') || trackId);

  const request = new Request('/funcs/dashboard/events/programming/TrackRoutes.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }

    fetchTracks();
  } catch (error) {
    hideLoader();
    showError('#track-form', error);
  }
}


/*---- Schedule info ----*/
async function updateScheduleDefaultView(viewType) {
  showLoader();
  hideError('#event-schedule-fixed');

  const params = new FormData();
  params.append('post_type', 'update_schedule_default_view');
  params.append('event_id', eventId);
  params.append('view_type', viewType);

  const request = new Request('/funcs/dashboard/events/EventDashboardRoute.php', {
    method: 'POST',
    body: params
  });

  try {
    const res = await fetch(request);
    const data = await res.json();

    if (!data.success) {
      throw data.err_msg;
    }
  } catch (error) {
    showError('#event-schedule-fixed', error);
  } finally {
    hideLoader();
  }
}
function quickScheduleChange(info) {
  info.start = info.start.toString().substr(0, info.start.toString().search('GMT'));
  info.start += getEstOffset(info.start);
  info.end = info.end.toString().substr(0, info.end.toString().search('GMT'));
  info.end += getEstOffset(info.end);
  info.start = Date.parse(info.start) / 1000;
  info.end = Date.parse(info.end) / 1000;
  info.track = info.track.toString().replace('t-', '');
  $('#event-schedule-error').html('');
  let params = new FormData();
  params.append('post_type', 'quick_update_schedule');
  params.append('event_id', eventId);
  params.append('id', info.id);
  params.append('start_time', info.start);
  params.append('end_time', info.end);
  params.append('track', info.track);
  const successFunc = function(data) {};
  const errorFunc = function(data){
    $('#event-schedule-error').html(data.err_msg);
  };
  const errorServerFunc = function(jqXHR, textStatus, errorThrown){
    $('#event-schedule-error').html(textStatus);
  };
  baseFuncsContentUpdate('dashboard/events/general/schedule-2018-06-17.php', params, successFunc, errorFunc, errorServerFunc, false, 0);
}

function publishSchedule(isChecked) {
  const params = new FormData();
  params.append('post_type', 'publish_schedule');
  params.append('event_id', eventId);
  params.append('publish', isChecked);
  const successFunc = function(data) {
    hideLoader();
  };
  const errorFunc = function(data) {
    $('#event-schedule-fixed .error').html(data.err_msg);
    $('#schedule_live, #schedule_live_mobile').prop('checked', false); //toggle back to off state on error
  };
  const errorServerFunc = function(jqXHR, textStatus, errorThrown) {
    $('#event-schedule-fixed .error').html(textStatus);
    $('#schedule_live, #schedule_live_mobile').prop('checked', false); //toggle back to off state on error
  };
  baseFuncsContentUpdate('dashboard/events/general/schedule-2018-06-17.php', params, successFunc, errorFunc, errorServerFunc, true, 0);
}
