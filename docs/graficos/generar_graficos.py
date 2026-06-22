"""
Genera los gráficos de Resultados del Capítulo de tesis (PNG 300 DPI).

Fuentes de datos (todas reales, ninguna inventada):
- Cobertura backend: backend/coverage/coverage-summary.json
- Cobertura frontend: frontend/app/coverage/unit/coverage-summary.json
- RF / Defectos: qa/06-informe/datos_consolidados.md
- Módulos backend: conteo de archivos *.module.ts en backend/src/
"""
from __future__ import annotations

import os
import matplotlib.pyplot as plt

OUTDIR = os.path.dirname(os.path.abspath(__file__))

# Paleta sobria (acorde con paleta morada de Vinki + neutros).
COLOR_OK = "#4C9F70"        # cubierto / logrado / resuelto (verde sobrio)
COLOR_MISS = "#C8553D"      # no cubierto / pendiente / alto (rojo tierra)
COLOR_NEUTRAL = "#9B9B9B"   # neutro / observación
COLOR_PRIMARY = "#7C3AED"   # acento Vinki
COLOR_SECONDARY = "#6D28D9"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.titleweight": "bold",
    "axes.edgecolor": "#333333",
    "axes.labelcolor": "#222222",
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "savefig.facecolor": "white",
    "savefig.dpi": 300,
})


def _save(fig, name: str) -> str:
    path = os.path.join(OUTDIR, name)
    fig.savefig(path, bbox_inches="tight", dpi=300)
    plt.close(fig)
    return path


def pastel_cobertura_backend():
    cubierto = 99.15  # statements % real (backend/coverage/coverage-summary.json)
    no_cubierto = round(100 - cubierto, 2)
    fig, ax = plt.subplots(figsize=(6, 5))
    wedges, _, autotexts = ax.pie(
        [cubierto, no_cubierto],
        labels=["Cubierto", "No cubierto"],
        colors=[COLOR_OK, COLOR_MISS],
        autopct=lambda p: f"{p:.2f}%",
        startangle=90,
        wedgeprops=dict(edgecolor="white", linewidth=2),
        textprops=dict(color="#222222"),
    )
    for t in autotexts:
        t.set_color("white")
        t.set_fontweight("bold")
    ax.set_title("Cobertura de pruebas unitarias — Backend\n(statements, Jest)")
    return _save(fig, "01_cobertura_backend.png")


def pastel_cobertura_frontend():
    cubierto = 83.46  # statements % real (frontend/app/coverage/unit/coverage-summary.json)
    no_cubierto = round(100 - cubierto, 2)
    fig, ax = plt.subplots(figsize=(6, 5))
    wedges, _, autotexts = ax.pie(
        [cubierto, no_cubierto],
        labels=["Cubierto", "No cubierto"],
        colors=[COLOR_OK, COLOR_MISS],
        autopct=lambda p: f"{p:.2f}%",
        startangle=90,
        wedgeprops=dict(edgecolor="white", linewidth=2),
        textprops=dict(color="#222222"),
    )
    for t in autotexts:
        t.set_color("white")
        t.set_fontweight("bold")
    ax.set_title("Cobertura de pruebas unitarias — Frontend\n(statements, Vitest)")
    return _save(fig, "02_cobertura_frontend.png")


def pastel_requerimientos():
    # qa/06-informe/datos_consolidados.md § 3 — matriz de trazabilidad:
    # 42 RF totales, 36 cubiertos, 6 diferidos (RF-37..41 por D-5).
    cubiertos = 36
    diferidos = 6
    fig, ax = plt.subplots(figsize=(6, 5))
    wedges, _, autotexts = ax.pie(
        [cubiertos, diferidos],
        labels=[f"Cubiertos ({cubiertos})", f"Diferidos ({diferidos})"],
        colors=[COLOR_OK, COLOR_NEUTRAL],
        autopct=lambda p: f"{p:.1f}%",
        startangle=90,
        wedgeprops=dict(edgecolor="white", linewidth=2),
        textprops=dict(color="#222222"),
    )
    for t in autotexts:
        t.set_color("white")
        t.set_fontweight("bold")
    ax.set_title("Requerimientos funcionales\n(42 totales, RF-37..41 diferidos por decisión D-5)")
    return _save(fig, "03_requerimientos_funcionales.png")


def pastel_defectos_severidad():
    # qa/06-informe/datos_consolidados.md § 8 — Hallazgos HE-01..HE-09 (9 totales):
    # HE-01 ALTA; HE-05 MEDIA-ALTA; HE-07 MEDIA; HE-06 BAJA-MEDIA;
    # HE-02, HE-03, HE-04, HE-08, HE-09 BAJA.
    data = [
        ("Alta", 1, "#A6232E"),
        ("Media-Alta", 1, "#C8553D"),
        ("Media", 1, "#E08E45"),
        ("Baja-Media", 1, "#E5B25D"),
        ("Baja", 5, "#9B9B9B"),
    ]
    labels = [f"{n} ({c})" for n, c, _ in data]
    sizes = [c for _, c, _ in data]
    colors = [c for *_, c in data]
    fig, ax = plt.subplots(figsize=(7, 5.5))
    wedges, _, autotexts = ax.pie(
        sizes,
        labels=labels,
        colors=colors,
        autopct=lambda p: f"{p:.1f}%",
        startangle=90,
        wedgeprops=dict(edgecolor="white", linewidth=2),
        textprops=dict(color="#222222"),
    )
    for t in autotexts:
        t.set_color("white")
        t.set_fontweight("bold")
    ax.set_title("Defectos detectados por severidad\n(HE-01 a HE-09 — 9 hallazgos totales)")
    return _save(fig, "04_defectos_severidad.png")


def barras_modulos():
    # backend/src/**/*.module.ts (13 archivos, incluyendo app.module.ts).
    # Agrupación por rol funcional (decidida por inspección del repo).
    categorias = [
        ("Núcleo / infraestructura\n(app, health, llm, rag)", 4),
        ("Identidad y acceso\n(auth)", 1),
        ("Dominio principal\n(interviews, evaluation,\nknowledge, reports, catalogs)", 5),
        ("UX / engagement\n(notifications, achievements,\nchallenges)", 3),
    ]
    labels = [c for c, _ in categorias]
    valores = [n for _, n in categorias]
    colores = [COLOR_PRIMARY, COLOR_SECONDARY, "#5B21B6", "#9B9B9B"]
    fig, ax = plt.subplots(figsize=(9, 5.5))
    bars = ax.bar(labels, valores, color=colores, edgecolor="white", linewidth=1.5)
    for b, v in zip(bars, valores):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.08, str(v),
                ha="center", va="bottom", fontweight="bold", color="#222222")
    ax.set_ylabel("Cantidad de módulos NestJS")
    ax.set_title("Módulos del backend por categoría\n(13 archivos *.module.ts en backend/src/)")
    ax.set_ylim(0, max(valores) + 1.2)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    plt.xticks(fontsize=9)
    return _save(fig, "05_modulos_backend.png")


def barras_defectos_estado():
    # qa/06-informe/datos_consolidados.md § 8.
    estados = [
        ("Resuelto", 2, COLOR_OK),                     # HE-01, HE-07
        ("Documentado\n(backlog)", 3, COLOR_NEUTRAL),  # HE-02, HE-03, HE-04
        ("Acotado /\nmitigado", 2, "#E5B25D"),         # HE-06, HE-09
        ("Trade-off\ndocumentado", 1, "#B8B8B8"),      # HE-08
        ("Diferido", 1, "#C8553D"),                    # HE-05
    ]
    labels = [e for e, _, _ in estados]
    valores = [n for _, n, _ in estados]
    colores = [c for *_, c in estados]
    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(labels, valores, color=colores, edgecolor="white", linewidth=1.5)
    for b, v in zip(bars, valores):
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 0.05, str(v),
                ha="center", va="bottom", fontweight="bold", color="#222222")
    ax.set_ylabel("Cantidad de defectos")
    ax.set_title("Estado de los defectos detectados\n(HE-01 a HE-09)")
    ax.set_ylim(0, max(valores) + 1)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))
    plt.xticks(fontsize=9)
    return _save(fig, "06_defectos_estado.png")


def main():
    paths = [
        pastel_cobertura_backend(),
        pastel_cobertura_frontend(),
        pastel_requerimientos(),
        pastel_defectos_severidad(),
        barras_modulos(),
        barras_defectos_estado(),
    ]
    print("\n".join(paths))


if __name__ == "__main__":
    main()
