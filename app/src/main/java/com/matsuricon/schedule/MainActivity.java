package com.matsuricon.schedule;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.widget.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class MainActivity extends Activity {
    private final ArrayList<Session> allSessions = new ArrayList<>();
    private final String[] days = {"All", "Thu", "Fri", "Sat", "Sun"};
    private String selectedDay = "All";
    private String query = "";
    private LinearLayout list;
    private TextView countText;
    private HorizontalScrollView dayScroller;
    private final ArrayList<TextView> dayButtons = new ArrayList<>();

    static class Session {
        String title, date, day, start, end, location, track, types, guests, description, status;
    }

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(Color.rgb(91, 33, 182));
        loadSchedule();
        buildUi();
        render();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(248, 247, 252));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(dp(20), dp(18), dp(20), dp(16));
        GradientDrawable headerBg = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{Color.rgb(91, 33, 182), Color.rgb(219, 39, 119)});
        header.setBackground(headerBg);

        TextView title = new TextView(this);
        title.setText("Matsuricon 2026");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        header.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Interactive convention schedule • Sept 3–6");
        subtitle.setTextColor(0xEFFFFFFF);
        subtitle.setTextSize(14);
        subtitle.setPadding(0, dp(4), 0, dp(12));
        header.addView(subtitle);

        EditText search = new EditText(this);
        search.setSingleLine(true);
        search.setHint("Search sessions, rooms, tracks, guests…");
        search.setTextSize(15);
        search.setPadding(dp(14), 0, dp(14), 0);
        search.setMinHeight(dp(48));
        GradientDrawable searchBg = round(Color.WHITE, dp(14), 0, 0);
        search.setBackground(searchBg);
        search.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int st, int c, int a) {}
            public void onTextChanged(CharSequence s, int st, int before, int c) { query = s.toString().toLowerCase(Locale.US).trim(); render(); }
            public void afterTextChanged(Editable e) {}
        });
        header.addView(search, new LinearLayout.LayoutParams(-1, dp(50)));
        root.addView(header);

        dayScroller = new HorizontalScrollView(this);
        dayScroller.setHorizontalScrollBarEnabled(false);
        LinearLayout dayRow = new LinearLayout(this);
        dayRow.setPadding(dp(12), dp(12), dp(12), dp(6));
        dayRow.setGravity(Gravity.CENTER_VERTICAL);
        for (String d : days) {
            TextView chip = new TextView(this);
            chip.setText(dayLabel(d));
            chip.setTextSize(14);
            chip.setTypeface(Typeface.DEFAULT_BOLD);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding(dp(16), dp(9), dp(16), dp(9));
            chip.setOnClickListener(v -> { selectedDay = d; render(); });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2);
            lp.setMargins(dp(4), 0, dp(4), 0);
            dayRow.addView(chip, lp);
            dayButtons.add(chip);
        }
        dayScroller.addView(dayRow);
        root.addView(dayScroller);

        countText = new TextView(this);
        countText.setTextColor(Color.rgb(75, 85, 99));
        countText.setTextSize(13);
        countText.setPadding(dp(20), dp(4), dp(20), dp(8));
        root.addView(countText);

        ScrollView scroll = new ScrollView(this);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(dp(14), 0, dp(14), dp(20));
        scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
    }

    private String dayLabel(String d) {
        switch (d) {
            case "Thu": return "Thu 9/3";
            case "Fri": return "Fri 9/4";
            case "Sat": return "Sat 9/5";
            case "Sun": return "Sun 9/6";
            default: return "All";
        }
    }

    private void render() {
        list.removeAllViews();
        for (TextView chip : dayButtons) {
            boolean on = chip.getText().toString().startsWith(selectedDay) || (selectedDay.equals("All") && chip.getText().toString().equals("All"));
            chip.setTextColor(on ? Color.WHITE : Color.rgb(91, 33, 182));
            chip.setBackground(round(on ? Color.rgb(91, 33, 182) : Color.WHITE, dp(22), on ? 0 : Color.rgb(221, 214, 254), on ? 0 : dp(1)));
        }

        int shown = 0;
        String lastDate = "";
        for (Session s : allSessions) {
            if (!selectedDay.equals("All") && !s.day.equals(selectedDay)) continue;
            if (!query.isEmpty() && !haystack(s).contains(query)) continue;
            shown++;
            if (!s.date.equals(lastDate)) {
                lastDate = s.date;
                TextView h = new TextView(this);
                h.setText(s.day + ", " + s.date);
                h.setTextColor(Color.rgb(31, 41, 55));
                h.setTextSize(18);
                h.setTypeface(Typeface.DEFAULT_BOLD);
                h.setPadding(dp(6), dp(16), dp(6), dp(8));
                list.addView(h);
            }
            list.addView(card(s));
        }
        countText.setText(shown + " of " + allSessions.size() + " sessions shown");
        if (shown == 0) {
            TextView empty = new TextView(this);
            empty.setText("No sessions match your filters.");
            empty.setGravity(Gravity.CENTER);
            empty.setTextSize(16);
            empty.setTextColor(Color.rgb(107, 114, 128));
            empty.setPadding(0, dp(60), 0, 0);
            list.addView(empty, new LinearLayout.LayoutParams(-1, -2));
        }
    }

    private View card(Session s) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(14), dp(16), dp(14));
        card.setBackground(round(Color.WHITE, dp(18), Color.rgb(229, 231, 235), dp(1)));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, 0, 0, dp(10));
        card.setLayoutParams(lp);

        TextView time = new TextView(this);
        String timeText = s.start + (s.end.isEmpty() ? "" : " – " + s.end);
        time.setText(timeText + "  •  " + s.location);
        time.setTextColor(Color.rgb(124, 58, 237));
        time.setTextSize(13);
        time.setTypeface(Typeface.DEFAULT_BOLD);
        card.addView(time);

        TextView title = new TextView(this);
        title.setText(s.title);
        title.setTextColor(Color.rgb(17, 24, 39));
        title.setTextSize(17);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(0, dp(5), 0, dp(5));
        card.addView(title);

        String meta = joinNonEmpty(s.track, s.types);
        if (!meta.isEmpty()) addSmall(card, meta, Color.rgb(75, 85, 99));
        if (!s.guests.isEmpty()) addSmall(card, "Guests: " + s.guests, Color.rgb(75, 85, 99));
        if (!s.description.isEmpty()) {
            TextView desc = new TextView(this);
            desc.setText(s.description);
            desc.setTextColor(Color.rgb(55, 65, 81));
            desc.setTextSize(13);
            desc.setPadding(0, dp(8), 0, 0);
            desc.setMaxLines(5);
            card.addView(desc);
        }
        return card;
    }

    private void addSmall(LinearLayout parent, String text, int color) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(color);
        tv.setTextSize(13);
        tv.setPadding(0, dp(2), 0, 0);
        parent.addView(tv);
    }

    private String haystack(Session s) {
        return (s.title + " " + s.date + " " + s.day + " " + s.start + " " + s.end + " " + s.location + " " + s.track + " " + s.types + " " + s.guests + " " + s.description).toLowerCase(Locale.US);
    }

    private String joinNonEmpty(String... values) {
        ArrayList<String> out = new ArrayList<>();
        for (String v : values) if (v != null && !v.trim().isEmpty()) out.add(v.trim());
        return android.text.TextUtils.join(" • ", out);
    }

    private void loadSchedule() {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(getAssets().open("matsuricon_2026_schedule.csv"), StandardCharsets.UTF_8))) {
            String header = br.readLine();
            String line;
            while ((line = br.readLine()) != null) {
                ArrayList<String> c = parseCsv(line);
                if (c.size() < 15) continue;
                Session s = new Session();
                s.title = c.get(1); s.date = c.get(2); s.day = c.get(3); s.start = c.get(4); s.end = c.get(5);
                s.location = c.get(9); s.track = c.get(10); s.types = c.get(11); s.guests = c.get(12);
                s.status = c.get(13); s.description = c.get(14);
                allSessions.add(s);
            }
        } catch (Exception e) {
            Toast.makeText(this, "Could not load schedule: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private ArrayList<String> parseCsv(String line) {
        ArrayList<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') { cur.append('"'); i++; }
                else inQuotes = !inQuotes;
            } else if (ch == ',' && !inQuotes) {
                out.add(cur.toString()); cur.setLength(0);
            } else cur.append(ch);
        }
        out.add(cur.toString());
        return out;
    }

    private GradientDrawable round(int fill, int radius, int strokeColor, int strokeWidth) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(fill);
        g.setCornerRadius(radius);
        if (strokeWidth > 0) g.setStroke(strokeWidth, strokeColor);
        return g;
    }

    private int dp(int v) { return (int) (v * getResources().getDisplayMetrics().density + 0.5f); }
}
