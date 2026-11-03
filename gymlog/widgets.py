"""Small reusable display components."""
import customtkinter as ctk
from . import theme as t


def label(parent, text, size=14, color=t.TEXT, bold=False, **kwargs):
    return ctk.CTkLabel(parent, text=text, text_color=color,
                        font=ctk.CTkFont(size=size, weight="bold" if bold else "normal"),
                        **kwargs)


class StatCard(ctk.CTkFrame):
    def __init__(self, parent, title, value, detail):
        super().__init__(parent, fg_color=t.PANEL, corner_radius=16)
        label(self, title, color=t.MUTED).pack(anchor="w", padx=22, pady=(18, 6))
        label(self, value, size=32, bold=True).pack(anchor="w", padx=22)
        label(self, detail, size=12, color=t.MUTED).pack(anchor="w", padx=22, pady=(4, 18))
