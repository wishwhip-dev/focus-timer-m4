# Plan

Goal: A pomodoro focus timer: Start, pause and reset a 25-minute session, a short break after, a soft chime when a session ends, and a daily count of finished sessions that survives a reload. Comfortable to use on a phone.

1. The home page shows a large countdown readout at 25:00 for a focus session, labelled with the current mode (Focus or Break), plus a visible Start button, all reachable by opening the root URL directly with no sign-in or URL parameters
2. Pressing Start begins the countdown and the readout ticks down every second to 24:59, 24:58 and so on; pressing it again (or a Pause control) stops the countdown at its current value, and pressing Resume continues from there
3. A Reset control returns the timer to the full 25:00 for the current mode; its label says Reset, and it works both while running and while paused; resetting a running or paused session does not count it as completed and leaves today's count unchanged
4. When the countdown reaches zero, a soft two-tone chime plays through the shared AudioContext from lib/audio.ts, unlocked by the Start press, so no sound is attempted before a user gesture; the readout shows 00:00 at the transition and never a negative value; a mute toggle on the page silences the chime and the choice is still in force after a reload
5. When a focus session ends, the timer switches to a 5-minute short break with its own countdown and Start control; when the break ends the same chime plays and it switches back to a fresh 25-minute focus session, and the mode label always shows which one is active
6. Each completed focus session increments a daily counter shown on the page as a readout such as 'Sessions today: 3'; the count is keyed by calendar date, so it starts again at zero on a new day
7. The daily count and each session's completion date are written to the Dexie database through lib/data query functions (not direct Dexie calls from components), and after finishing sessions and reloading the page the count for today is still correct; a session still running when the page is reloaded is not counted — the timer returns to 25:00 and today's count is unchanged
8. A history section shows the last 7 days as a bar chart (via the themed chart component) of sessions per day, with each day labelled, rendering even when some or all of the days have zero sessions
9. The timer keeps correct time while the tab is hidden or the phone screen is off: it counts down from real elapsed time rather than relying on interval ticks, so returning to the tab shows the true remaining time (or the already-finished transition), not a stale value
10. The timer can be operated from the keyboard: Space toggles start/pause and R resets, without the focus leaving the page and without the page scrolling
11. On a phone-sized viewport the timer, controls and history fit the screen without horizontal scrolling and the main buttons are large enough to tap comfortably
12. The Start/Pause control is the visually primary action — the largest button on the page, with Reset smaller and secondary — and the running versus paused states are visibly distinct, with the running readout emphasised and the paused readout dimmed
13. The page title and app name in app/identity.ts are updated to the app's actual name and a description of the pomodoro timer, replacing the placeholder text

These are the outcomes this task is judged against.