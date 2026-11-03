"""Application shell and event callbacks."""
from datetime import date
import customtkinter as ctk
from . import theme as t
from .models import create_workout, demo_workouts, weekly_workouts
from .widgets import StatCard, label


class GymLogApp(ctk.CTk):
    def __init__(self):
        ctk.set_appearance_mode("dark")
        super().__init__()
        self.title("GymLog | Build your rhythm")
        self.geometry("1100x780")
        self.minsize(900, 650)
        self.configure(fg_color=t.BG)
        self.workouts = demo_workouts(date.today())
        self.goal = 4
        self.dialog = None
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        sidebar = ctk.CTkFrame(self, width=200, fg_color=t.PANEL, corner_radius=0)
        sidebar.grid(row=0, column=0, sticky="nsew")
        sidebar.grid_propagate(False)
        label(sidebar, "GYMLOG", size=26, color=t.ACCENT, bold=True).pack(anchor="w", padx=24, pady=(34, 4))
        label(sidebar, "BUILD YOUR RHYTHM", size=10, color=t.MUTED).pack(anchor="w", padx=24, pady=(0, 36))
        ctk.CTkButton(sidebar, text="Dashboard", fg_color=t.ACCENT, text_color=t.BG,
                      hover_color=t.HOVER, command=self.refresh).pack(fill="x", padx=18)
        ctk.CTkButton(sidebar, text="+ Log workout", fg_color="transparent", border_width=1,
                      border_color="#3C444F", command=self.open_log).pack(fill="x", padx=18, pady=12)
        label(sidebar, "STUDENT EDITION\nSession-only storage", size=12, color=t.MUTED,
              justify="left").pack(side="bottom", anchor="w", padx=24, pady=26)
        self.content = ctk.CTkScrollableFrame(self, fg_color=t.BG, corner_radius=0)
        self.content.grid(row=0, column=1, sticky="nsew", padx=28, pady=24)
        self.content.grid_columnconfigure(0, weight=1)
        self.refresh()

    def refresh(self):
        """Rebuild the dashboard from the current list after each change."""
        for child in self.content.winfo_children():
            child.destroy()
        today = date.today()
        week = weekly_workouts(self.workouts, today)
        header = ctk.CTkFrame(self.content, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", pady=(0, 22))
        label(header, "Your training, at a glance", size=28, bold=True).pack(anchor="w")
        label(header, today.strftime("%A, %d %B %Y"), color=t.MUTED).pack(anchor="w", pady=(6, 0))
        hero = ctk.CTkFrame(self.content, fg_color="#283322", corner_radius=18)
        hero.grid(row=1, column=0, sticky="ew", pady=(0, 20))
        label(hero, "SHOW UP. GET STRONGER.", size=12, color=t.ACCENT, bold=True).pack(anchor="w", padx=24, pady=(22, 8))
        label(hero, "One workout at a time.", size=27, bold=True).pack(anchor="w", padx=24)
        label(hero, "Log today's session and keep your week moving.", color="#C3CEBB").pack(anchor="w", padx=24, pady=(6, 16))
        ctk.CTkButton(hero, text="+ Log a workout", fg_color=t.ACCENT, hover_color=t.HOVER,
                      text_color=t.BG, height=40, command=self.open_log).pack(anchor="w", padx=24, pady=(0, 22))
        stats = ctk.CTkFrame(self.content, fg_color="transparent")
        stats.grid(row=2, column=0, sticky="ew", pady=(0, 20))
        stats.grid_columnconfigure((0, 1, 2), weight=1, uniform="stats")
        for col, values in enumerate([
            ("THIS WEEK", str(len(week)), "workouts since Monday"),
            ("TRAINING TIME", str(sum(w.minutes for w in week)), "minutes this week"),
            ("TOTAL SESSIONS", str(len(self.workouts)), "in this demo session"),
        ]):
            StatCard(stats, *values).grid(row=0, column=col, sticky="ew", padx=(0 if col == 0 else 6, 0 if col == 2 else 6))
        progress = ctk.CTkFrame(self.content, fg_color=t.PANEL, corner_radius=16)
        progress.grid(row=3, column=0, sticky="ew", pady=(0, 20))
        label(progress, f"Weekly goal    {len(week)} / {self.goal} workouts", size=16, bold=True).pack(anchor="w", padx=22, pady=(18, 12))
        bar = ctk.CTkProgressBar(progress, progress_color=t.ACCENT, fg_color="#343B44")
        bar.pack(fill="x", padx=22)
        bar.set(min(len(week) / self.goal, 1))
        message = "Goal reached. Great consistency!" if len(week) >= self.goal else f"{self.goal - len(week)} more to reach your goal."
        label(progress, message, size=12, color=t.MUTED).pack(anchor="w", padx=22, pady=(8, 18))
        label(self.content, "Workout history", size=20, bold=True).grid(row=4, column=0, sticky="w", pady=(0, 10))
        label(self.content, "Sample workouts are preloaded. New entries are dated today. Closing the app resets all entries.",
              size=12, color=t.MUTED, wraplength=650, justify="left").grid(row=5, column=0, sticky="w", pady=(0, 12))
        for row, workout in enumerate(sorted(self.workouts, key=lambda w: w.day, reverse=True), start=6):
            item = ctk.CTkFrame(self.content, fg_color=t.PANEL, corner_radius=12)
            item.grid(row=row, column=0, sticky="ew", pady=(0, 8))
            label(item, workout.name, bold=True).pack(side="left", padx=18, pady=16)
            label(item, f"{workout.day:%d %b}    |    {workout.minutes} min", color=t.MUTED).pack(side="right", padx=18)

    def open_log(self):
        if self.dialog is not None and self.dialog.winfo_exists():
            self.dialog.focus()
            return
        self.dialog = ctk.CTkToplevel(self)
        self.dialog.title("Log workout")
        self.dialog.geometry("420x360")
        self.dialog.resizable(False, False)
        self.dialog.transient(self)
        self.dialog.configure(fg_color=t.BG)
        label(self.dialog, "Make it count.", size=24, bold=True).pack(anchor="w", padx=24, pady=(24, 16))
        label(self.dialog, "Workout name", color=t.MUTED).pack(anchor="w", padx=24)
        name = ctk.CTkEntry(self.dialog, placeholder_text="e.g. Upper body strength", height=36)
        name.pack(fill="x", padx=24, pady=(4, 12))
        label(self.dialog, "Duration (minutes)", color=t.MUTED).pack(anchor="w", padx=24)
        minutes = ctk.CTkEntry(self.dialog, placeholder_text="e.g. 45", height=36)
        minutes.pack(fill="x", padx=24, pady=(4, 8))
        error = label(self.dialog, "", size=12, color="#FF9E9E", wraplength=370)
        error.pack(padx=24)

        def save():
            try:
                workout = create_workout(name.get(), minutes.get())
            except ValueError as exc:
                error.configure(text=str(exc))
                return
            self.workouts.append(workout)
            self.dialog.destroy()
            self.dialog = None
            self.refresh()

        ctk.CTkButton(self.dialog, text="Save workout", height=38, fg_color=t.ACCENT,
                      hover_color=t.HOVER, text_color=t.BG, command=save).pack(fill="x", padx=24, pady=(8, 16))
        self.dialog.bind("<Return>", lambda event: save())
        self.dialog.bind("<Escape>", lambda event: self.dialog.destroy())
        self.dialog.after(100, name.focus_set)
