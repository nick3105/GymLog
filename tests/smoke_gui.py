"""Run with python -m tests.smoke_gui on a graphical desktop."""
import customtkinter as ctk
from gymlog.app import GymLogApp
from gymlog.models import weekly_workouts
from datetime import date

app = GymLogApp()
try:
    app.update()
    initial = len(app.workouts)
    app.open_log()
    app.update()
    dialog = app.dialog
    app.open_log()
    assert app.dialog is dialog, "Only one form should open"
    entries = [w for w in dialog.winfo_children() if isinstance(w, ctk.CTkEntry)]
    button = next(w for w in dialog.winfo_children() if isinstance(w, ctk.CTkButton))
    entries[0].insert(0, "Smoke test")
    entries[1].insert(0, "bad")
    button.invoke()
    assert len(app.workouts) == initial
    assert any(isinstance(w, ctk.CTkLabel) and "whole number" in w.cget("text")
               for w in dialog.winfo_children())
    entries[1].delete(0, "end")
    entries[1].insert(0, "35")
    before_minutes = sum(w.minutes for w in weekly_workouts(app.workouts, date.today()))
    button.invoke()
    app.update()
    assert len(app.workouts) == initial + 1
    assert app.dialog is None
    assert sum(w.minutes for w in weekly_workouts(app.workouts, date.today())) == before_minutes + 35
    def label_texts(widget):
        texts = [widget.cget("text")] if isinstance(widget, ctk.CTkLabel) else []
        for child in widget.winfo_children():
            texts.extend(label_texts(child))
        return texts

    texts = label_texts(app.content)
    assert "Smoke test" in texts, "Saved workout should render in history"
    assert str(initial + 1) in texts, "Total sessions should refresh"
    expected_minutes = before_minutes + 35
    assert str(expected_minutes) in texts, "Weekly training time should refresh"
    for _ in range(5):
        app.workouts.append(app.workouts[-1])
    app.refresh()
    app.update()
    bars = [w for section in app.content.winfo_children()
            for w in section.winfo_children() if isinstance(w, ctk.CTkProgressBar)]
    assert bars[0].get() == 1, "Progress should cap at 100 percent"
    app.geometry("900x650")
    app.update()
    app.open_log()
    app.update()
    app.dialog.destroy()
    app.open_log()
    app.update()
    print("PASS: dashboard, form, validation, save, refresh, resize and reopen")
finally:
    app.destroy()
