package com.matsuricon.schedule;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.*;
import android.view.*;
import android.widget.*;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.*;
import java.util.*;

public class MainActivity extends Activity {
    private final ArrayList<Session> allSessions = new ArrayList<>();
    private final ArrayList<TextView> dayButtons = new ArrayList<>();
    private final Set<String> bookmarks = new HashSet<>();
    private final String[] days = {"All", "Thu", "Fri", "Sat", "Sun"};
    private String selectedView = "Schedule", selectedDay = "All", query = "", locationFilter = "", trackFilter = "", typeFilter = "";
    private boolean bookmarkedOnly = false, filtersOpen = false;
    private LinearLayout root, list, dayRow, filterBody;
    private TextView countText, filterToggle, menuButton;
    private EditText searchField;
    private ScrollView scrollView;
    private boolean searchHidden = false;
    private SharedPreferences prefs;

    static class Session {
        String id, title, date, day, start, end, startIso, endIso, location, track, types, guests, description, detailUrl;
    }

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.rgb(91, 33, 182));
        prefs = getSharedPreferences("matsuricon2026", MODE_PRIVATE);
        bookmarks.addAll(prefs.getStringSet("bookmarks", new HashSet<>()));
        loadSchedule();
        buildUi();
        render();
    }

    private void buildUi() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(248, 247, 252));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(dp(14), dp(10), dp(14), dp(10));
        header.setBackground(new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{Color.rgb(91, 33, 182), Color.rgb(219, 39, 119)}));

        LinearLayout headerTop = new LinearLayout(this);
        headerTop.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text("Matsuricon 2026", 23, Color.WHITE, true);
        headerTop.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        menuButton = text("≡", 30, Color.WHITE, true);
        menuButton.setGravity(Gravity.CENTER);
        menuButton.setBackground(round(0x22FFFFFF, dp(12), 0, 0));
        menuButton.setOnClickListener(v -> showMenu());
        headerTop.addView(menuButton, new LinearLayout.LayoutParams(dp(42), dp(40)));
        header.addView(headerTop);

        searchField = new EditText(this);
        searchField.setSingleLine(true);
        searchField.setHint("Search schedule…");
        searchField.setTextSize(15);
        searchField.setPadding(dp(14), 0, dp(14), 0);
        searchField.setMinHeight(dp(46));
        searchField.setBackground(round(Color.WHITE, dp(14), 0, 0));
        searchField.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
            public void onTextChanged(CharSequence s, int st, int before, int c) { query = s.toString().toLowerCase(Locale.US).trim(); render(); }
            public void afterTextChanged(Editable e) {}
        });
        LinearLayout.LayoutParams searchLp = new LinearLayout.LayoutParams(-1, dp(48));
        searchLp.setMargins(0, dp(10), 0, 0);
        header.addView(searchField, searchLp);
        root.addView(header);

        scrollView = new ScrollView(this);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(dp(14), 0, dp(14), dp(20));
        scrollView.addView(list);
        scrollView.getViewTreeObserver().addOnScrollChangedListener(() -> {
            boolean hide = scrollView.getScrollY() > dp(70);
            if (hide != searchHidden) {
                searchHidden = hide;
                searchField.setVisibility(hide ? View.GONE : View.VISIBLE);
            }
        });
        root.addView(scrollView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
    }

    private void showMenu() {
        final String[] items = {"Schedule", "Bookmarks (" + bookmarks.size() + ")", "Dashboard", "Download APK / Website"};
        new AlertDialog.Builder(this)
                .setItems(items, (d, which) -> {
                    if (which == 0) selectedView = "Schedule";
                    else if (which == 1) selectedView = "Bookmarks";
                    else if (which == 2) selectedView = "Dashboard";
                    else startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://matsuricon.carwick.org/")));
                    render();
                })
                .show();
    }

    private void render() {
        list.removeAllViews();
        if (selectedView.equals("Schedule")) renderSchedule();
        else if (selectedView.equals("Bookmarks")) renderBookmarks();
        else renderDashboard();
    }

    private void renderSchedule() {
        renderDayChips();
        renderFilterPanel();
        countText = text("", 13, Color.rgb(75, 85, 99), false);
        countText.setPadding(dp(6), dp(4), dp(6), dp(8));
        list.addView(countText);
        ArrayList<Session> shown = filteredSessions();
        countText.setText(shown.size() + " of " + allSessions.size() + " sessions shown");
        renderGrouped(shown);
    }

    private void renderDayChips() {
        HorizontalScrollView scroller = new HorizontalScrollView(this);
        scroller.setHorizontalScrollBarEnabled(false);
        dayRow = new LinearLayout(this);
        dayRow.setPadding(0, dp(12), 0, dp(6));
        dayButtons.clear();
        for (String d : days) {
            TextView chip = text(dayLabel(d), 14, Color.rgb(91, 33, 182), true);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding(dp(16), dp(9), dp(16), dp(9));
            chip.setOnClickListener(v -> { selectedDay = d; render(); });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
            lp.setMargins(dp(4), 0, dp(4), 0);
            dayRow.addView(chip, lp);
            dayButtons.add(chip);
        }
        scroller.addView(dayRow);
        list.addView(scroller);
        styleDayChips();
    }

    private void styleDayChips() {
        for (TextView chip : dayButtons) {
            boolean on = chip.getText().toString().startsWith(selectedDay) || (selectedDay.equals("All") && chip.getText().toString().equals("All"));
            chip.setTextColor(on ? Color.WHITE : Color.rgb(91, 33, 182));
            chip.setBackground(round(on ? Color.rgb(91, 33, 182) : Color.WHITE, dp(22), Color.rgb(221, 214, 254), on ? 0 : dp(1)));
        }
    }

    private void renderFilterPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(12), dp(12), dp(12), dp(12));
        panel.setBackground(round(Color.WHITE, dp(18), Color.rgb(221, 214, 254), dp(1)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, 0, 0, dp(10));
        list.addView(panel, lp);
        filterToggle = text((filtersOpen ? "▾" : "▸") + " Filters", 16, Color.rgb(76, 29, 149), true);
        filterToggle.setOnClickListener(v -> { filtersOpen = !filtersOpen; render(); });
        panel.addView(filterToggle);
        if (!filtersOpen) return;
        filterBody = panel;
        addSpinner("Location", unique("location"), locationFilter, value -> { locationFilter = value; render(); });
        addSpinner("Track", unique("track"), trackFilter, value -> { trackFilter = value; render(); });
        addSpinner("Type / Tag", unique("type"), typeFilter, value -> { typeFilter = value; render(); });
        CheckBox cb = new CheckBox(this);
        cb.setText("Bookmarked only"); cb.setChecked(bookmarkedOnly);
        cb.setOnCheckedChangeListener((b, checked) -> { bookmarkedOnly = checked; render(); });
        panel.addView(cb);
        Button clear = new Button(this);
        clear.setText("Clear filters");
        clear.setOnClickListener(v -> { selectedDay = "All"; locationFilter = trackFilter = typeFilter = query = ""; bookmarkedOnly = false; render(); });
        panel.addView(clear);
    }

    private interface Pick { void set(String value); }
    private void addSpinner(String label, ArrayList<String> options, String selected, Pick pick) {
        filterBody.addView(text(label, 13, Color.rgb(75,85,99), true));
        Spinner sp = new Spinner(this);
        ArrayList<String> vals = new ArrayList<>(); vals.add("All"); vals.addAll(options);
        ArrayAdapter<String> ad = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, vals);
        sp.setAdapter(ad);
        sp.setSelection(Math.max(0, vals.indexOf(selected.isEmpty() ? "All" : selected)));
        sp.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            boolean first = true;
            public void onItemSelected(AdapterView<?> p, View v, int pos, long id) { if (first) { first = false; return; } pick.set(pos == 0 ? "" : vals.get(pos)); }
            public void onNothingSelected(AdapterView<?> p) {}
        });
        filterBody.addView(sp);
    }

    private void renderBookmarks() {
        TextView h = text("Your bookmarks", 22, Color.rgb(31, 41, 55), true);
        h.setPadding(dp(6), dp(14), dp(6), dp(8));
        list.addView(h);
        Button clear = new Button(this);
        clear.setText("Clear all bookmarks");
        clear.setOnClickListener(v -> new AlertDialog.Builder(this).setMessage("Remove all bookmarks?").setPositiveButton("Clear", (d,w) -> { bookmarks.clear(); saveBookmarks(); render(); }).setNegativeButton("Cancel", null).show());
        list.addView(clear);
        renderGrouped(bookmarkedSessions());
    }

    private void renderDashboard() {
        ArrayList<Session> saved = bookmarkedSessions();
        list.addView(text("Dashboard", 24, Color.rgb(31, 41, 55), true));
        stat("Bookmarked sessions", String.valueOf(saved.size()));
        stat("Days planned", String.valueOf(uniqueDates(saved).size()));
        stat("Scheduled hours", String.format(Locale.US, "%.1f", totalHours(saved)));
        TextView h = text("Personal agenda", 20, Color.rgb(31, 41, 55), true);
        h.setPadding(0, dp(18), 0, dp(6));
        list.addView(h);
        renderGrouped(saved);
    }

    private void stat(String label, String value) {
        TextView tv = text(value + "\n" + label, 16, Color.rgb(91, 33, 182), true);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(dp(10), dp(12), dp(10), dp(12));
        tv.setBackground(round(Color.WHITE, dp(18), Color.rgb(221, 214, 254), dp(1)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.setMargins(0, dp(8), 0, 0);
        list.addView(tv, lp);
    }

    private void renderGrouped(ArrayList<Session> sessions) {
        if (sessions.isEmpty()) { empty("No sessions to show."); return; }
        String lastDate = "";
        for (Session s : sessions) {
            if (!s.date.equals(lastDate)) {
                lastDate = s.date;
                TextView h = text(s.day + ", " + s.date, 18, Color.rgb(31, 41, 55), true);
                h.setPadding(dp(6), dp(16), dp(6), dp(8));
                list.addView(h);
            }
            list.addView(card(s));
        }
    }

    private View card(Session s) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(14), dp(16), dp(14));
        card.setBackground(round(Color.WHITE, dp(18), Color.rgb(229, 231, 235), dp(1)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.setMargins(0, 0, 0, dp(10)); card.setLayoutParams(lp);
        card.addView(text(s.start + (s.end.isEmpty() ? "" : " – " + s.end) + "  •  " + s.location, 13, Color.rgb(124, 58, 237), true));
        TextView title = text(s.title, 17, Color.rgb(17, 24, 39), true); title.setPadding(0, dp(5), 0, dp(5)); card.addView(title);
        String meta = joinNonEmpty(s.track, s.types, s.guests.isEmpty() ? "" : "Guests: " + s.guests);
        if (!meta.isEmpty()) card.addView(text(meta, 13, Color.rgb(75, 85, 99), false));
        if (!s.description.isEmpty()) { TextView desc = text(s.description, 13, Color.rgb(55, 65, 81), false); desc.setPadding(0, dp(8), 0, 0); desc.setMaxLines(4); card.addView(desc); }
        LinearLayout actions = new LinearLayout(this);
        actions.setPadding(0, dp(10), 0, 0);
        TextView save = actionButton(bookmarks.contains(s.id) ? "Saved" : "Save", bookmarks.contains(s.id));
        save.setOnClickListener(v -> { if (bookmarks.contains(s.id)) bookmarks.remove(s.id); else bookmarks.add(s.id); saveBookmarks(); render(); });
        TextView details = actionButton("Details", false);
        details.setOnClickListener(v -> showDetails(s));
        LinearLayout.LayoutParams saveLp = new LinearLayout.LayoutParams(0, dp(44), 1);
        saveLp.setMargins(0, 0, dp(6), 0);
        LinearLayout.LayoutParams detailsLp = new LinearLayout.LayoutParams(0, dp(44), 1);
        detailsLp.setMargins(dp(6), 0, 0, 0);
        actions.addView(save, saveLp); actions.addView(details, detailsLp);
        card.addView(actions);
        return card;
    }

    private TextView actionButton(String label, boolean primary) {
        TextView tv = text(label, 14, primary ? Color.WHITE : Color.rgb(76, 29, 149), true);
        tv.setGravity(Gravity.CENTER);
        tv.setBackground(round(primary ? Color.rgb(219, 39, 119) : Color.rgb(239, 231, 255), dp(13), primary ? 0 : Color.rgb(221, 214, 254), primary ? 0 : dp(1)));
        return tv;
    }

    private ArrayList<Session> filteredSessions() {
        ArrayList<Session> out = new ArrayList<>();
        for (Session s : allSessions) {
            if (!selectedDay.equals("All") && !s.day.equals(selectedDay)) continue;
            if (!query.isEmpty() && !haystack(s).contains(query)) continue;
            if (!locationFilter.isEmpty() && !s.location.equals(locationFilter)) continue;
            if (!trackFilter.isEmpty() && !s.track.equals(trackFilter)) continue;
            if (!typeFilter.isEmpty() && !Arrays.asList(s.types.split(";\\s*|,\\s*")).contains(typeFilter)) continue;
            if (bookmarkedOnly && !bookmarks.contains(s.id)) continue;
            out.add(s);
        }
        return out;
    }

    private ArrayList<Session> bookmarkedSessions() { ArrayList<Session> out = new ArrayList<>(); for (Session s : allSessions) if (bookmarks.contains(s.id)) out.add(s); return out; }
    private void saveBookmarks() { prefs.edit().putStringSet("bookmarks", new HashSet<>(bookmarks)).apply(); }
    private void showDetails(Session s) { new AlertDialog.Builder(this).setTitle(s.title).setMessage(s.day + " " + s.date + "\n" + s.start + " – " + s.end + "\n" + joinNonEmpty(s.location, s.track, s.types, s.guests) + "\n\n" + (s.description.isEmpty() ? "No description provided." : s.description)).setPositiveButton("OK", null).show(); }
    private void empty(String msg) { TextView e = text(msg, 16, Color.rgb(107, 114, 128), false); e.setGravity(Gravity.CENTER); e.setPadding(0, dp(40), 0, 0); list.addView(e, new LinearLayout.LayoutParams(-1, -2)); }
    private TextView text(String s, int size, int color, boolean bold) { TextView tv = new TextView(this); tv.setText(s); tv.setTextSize(size); tv.setTextColor(color); if (bold) tv.setTypeface(Typeface.DEFAULT_BOLD); return tv; }
    private String dayLabel(String d) { if (d.equals("Thu")) return "Thu 9/3"; if (d.equals("Fri")) return "Fri 9/4"; if (d.equals("Sat")) return "Sat 9/5"; if (d.equals("Sun")) return "Sun 9/6"; return "All"; }
    private String haystack(Session s) { return (s.title + " " + s.date + " " + s.day + " " + s.start + " " + s.end + " " + s.location + " " + s.track + " " + s.types + " " + s.guests + " " + s.description).toLowerCase(Locale.US); }
    private String joinNonEmpty(String... values) { ArrayList<String> out = new ArrayList<>(); for (String v : values) if (v != null && !v.trim().isEmpty()) out.add(v.trim()); return TextUtils.join(" • ", out); }
    private ArrayList<String> unique(String field) { TreeSet<String> set = new TreeSet<>(); for (Session s : allSessions) { String v = field.equals("location") ? s.location : field.equals("track") ? s.track : s.types; if (field.equals("type")) for (String t : v.split(";\\s*|,\\s*")) if (!t.trim().isEmpty()) set.add(t.trim()); else {} else if (!v.trim().isEmpty()) set.add(v.trim()); } return new ArrayList<>(set); }
    private Set<String> uniqueDates(ArrayList<Session> ss) { HashSet<String> set = new HashSet<>(); for (Session s : ss) set.add(s.date); return set; }
    private double totalHours(ArrayList<Session> ss) { double h = 0; SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US); for (Session s : ss) try { if (!s.endIso.isEmpty()) h += Math.max(0, f.parse(s.endIso).getTime() - f.parse(s.startIso).getTime()) / 3600000.0; } catch(Exception ignored) {} return h; }

    private void loadSchedule() {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(getAssets().open("matsuricon_2026_schedule.csv"), StandardCharsets.UTF_8))) {
            br.readLine(); String line;
            while ((line = br.readLine()) != null) {
                ArrayList<String> c = parseCsv(line); if (c.size() < 16) continue;
                Session s = new Session();
                s.id = c.get(0); s.title = c.get(1); s.date = c.get(2); s.day = c.get(3); s.start = c.get(4); s.end = c.get(5); s.startIso = c.get(6); s.endIso = c.get(7);
                s.location = c.get(9); s.track = c.get(10); s.types = c.get(11); s.guests = c.get(12); s.description = c.get(14); s.detailUrl = c.get(15);
                allSessions.add(s);
            }
        } catch (Exception e) { Toast.makeText(this, "Could not load schedule: " + e.getMessage(), Toast.LENGTH_LONG).show(); }
    }
    private ArrayList<String> parseCsv(String line) { ArrayList<String> out = new ArrayList<>(); StringBuilder cur = new StringBuilder(); boolean q = false; for (int i=0;i<line.length();i++) { char ch=line.charAt(i); if (ch=='\"') { if (q && i+1<line.length() && line.charAt(i+1)=='\"') { cur.append('\"'); i++; } else q=!q; } else if (ch==',' && !q) { out.add(cur.toString()); cur.setLength(0); } else cur.append(ch); } out.add(cur.toString()); return out; }
    private GradientDrawable round(int fill, int radius, int strokeColor, int strokeWidth) { GradientDrawable g = new GradientDrawable(); g.setColor(fill); g.setCornerRadius(radius); if (strokeWidth > 0) g.setStroke(strokeWidth, strokeColor); return g; }
    private int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + 0.5f); }
}
