
from flask import Flask, render_template, request, jsonify, send_file
from datetime import date, timedelta
import oracledb
import os
import io
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


# ==========================================
# 1. FLASK APPLICATION
# ==========================================

app = Flask(__name__)


# ==========================================
# 2. ORACLE DATABASE CONFIGURATION
# ==========================================

DB_USER = os.getenv("ORACLE_USER", "DAILY_WELLNESS")
DB_PASSWORD = os.getenv("ORACLE_PASSWORD")
DB_DSN = os.getenv("ORACLE_DSN", "localhost:1521/FREEPDB1")


def get_connection():
    if not DB_PASSWORD:
        raise RuntimeError(
            "ORACLE_PASSWORD is not set. Set it in the terminal first."
        )

    return oracledb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        dsn=DB_DSN
    )


# ==========================================
# 3. EMPTY WELLNESS RECORD
# ==========================================

def empty_record():
    return {
        "habits": [False] * 6,
        "water": 0,
        "mood": "Okay",
        "sleep": 8,
        "activity": 0
    }


# ==========================================
# 4. CONVERT ORACLE ROW TO PYTHON DATA
# ==========================================

def row_to_record(row):
    if row is None:
        return empty_record()

    return {
        "habits": [value == "Y" for value in row[0:6]],
        "water": int(row[6] or 0),
        "mood": row[7] or "Okay",
        "sleep": float(row[8] or 0),
        "activity": int(row[9] or 0)
    }


# ==========================================
# 5. HOME PAGE
# ==========================================

@app.route("/")
def home():
    return render_template("index.html")


# ==========================================
# 6. LOAD TODAY'S DATA FROM ORACLE
# ==========================================

@app.get("/api/today")
def get_today():
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:

                cursor.execute("""
                    SELECT
                        HABIT_1,
                        HABIT_2,
                        HABIT_3,
                        HABIT_4,
                        HABIT_5,
                        HABIT_6,
                        WATER_GLASSES,
                        MOOD,
                        SLEEP_HOURS,
                        ACTIVITY_MINUTES
                    FROM WELLNESS_DAILY_RECORDS
                    WHERE RECORD_DATE >= TRUNC(SYSDATE)
                      AND RECORD_DATE < TRUNC(SYSDATE) + 1
                """)

                row = cursor.fetchone()

        record = row_to_record(row)

        print("LOADED FROM ORACLE:", record)

        return jsonify(record)

    except Exception:
        app.logger.exception(
            "Could not load today's wellness record"
        )

        return jsonify({
            "error": "Could not load data from Oracle."
        }), 500


# ==========================================
# 7. SAVE TODAY'S DATA TO ORACLE
# ==========================================

@app.post("/api/today")
def save_today():

    payload = request.get_json(silent=True) or {}

    # Read habits
    habits = payload.get("habits", [False] * 6)

    if not isinstance(habits, list):
        habits = [False] * 6

    habits = [value is True for value in habits[:6]]
    habits += [False] * (6 - len(habits))

    # Read numerical values
    try:
        water = int(payload.get("water", 0))
        sleep = float(payload.get("sleep", 0))
        activity = int(payload.get("activity", 0))

        if not 0 <= water <= 8:
            raise ValueError("Water must be between 0 and 8.")

        if not 0 <= sleep <= 24:
            raise ValueError("Sleep must be between 0 and 24 hours.")

        if not 0 <= activity <= 1440:
            raise ValueError("Activity must be between 0 and 1440 minutes.")

    except (TypeError, ValueError):
        return jsonify({
            "error": "Please enter valid numeric values."
        }), 400

    # Read mood
    mood_options = {
        "Happy",
        "Calm",
        "Okay",
        "Tired",
        "Stressed"
    }

    mood = payload.get("mood", "Okay")

    if mood not in mood_options:
        mood = "Okay"

    # Convert habits to Oracle CHAR values
    habit_values = [
        "Y" if value else "N"
        for value in habits
    ]

    # Debug information
    print("\n========== SAVE REQUEST ==========")
    print("DATE:", date.today())
    print("HABITS:", habits)
    print("WATER:", water)
    print("MOOD:", mood)
    print("SLEEP:", sleep)
    print("ACTIVITY:", activity)

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:

                # Save through the existing PL/SQL procedure
                cursor.callproc(
                    "SAVE_WELLNESS_RECORD",
                    [
                        date.today(),
                        *habit_values,
                        water,
                        mood,
                        sleep,
                        activity
                    ]
                )

                # Read back the saved values from Oracle
                cursor.execute("""
                    SELECT
                        HABIT_1,
                        HABIT_2,
                        HABIT_3,
                        HABIT_4,
                        HABIT_5,
                        HABIT_6,
                        WATER_GLASSES,
                        MOOD,
                        SLEEP_HOURS,
                        ACTIVITY_MINUTES
                    FROM WELLNESS_DAILY_RECORDS
                    WHERE RECORD_DATE >= TRUNC(SYSDATE)
                      AND RECORD_DATE < TRUNC(SYSDATE) + 1
                """)

                saved_row = cursor.fetchone()

                if saved_row is None:
                    raise RuntimeError(
                        "Procedure ran, but today's record was not found."
                    )

                saved_record = row_to_record(saved_row)

                print("SAVED IN ORACLE:", saved_record)
                print("==================================\n")

        return jsonify({
            "message": "Saved successfully to Oracle Database.",
            "date": date.today().isoformat(),
            "data": saved_record
        }), 200

    except Exception:
        app.logger.exception(
            "Could not save wellness record"
        )

        return jsonify({
            "error": "Could not save data to Oracle. Check the terminal."
        }), 500


# ==========================================
# 8. PROGRESS CHART
# ==========================================

@app.get("/progress-chart.png")
def progress_chart():

    try:
        start_date = date.today() - timedelta(days=6)

        with get_connection() as connection:
            with connection.cursor() as cursor:

                cursor.execute("""
                    SELECT
                        RECORD_DATE,
                        HABIT_1,
                        HABIT_2,
                        HABIT_3,
                        HABIT_4,
                        HABIT_5,
                        HABIT_6,
                        WATER_GLASSES
                    FROM WELLNESS_DAILY_RECORDS
                    WHERE RECORD_DATE >= :start_date
                      AND RECORD_DATE < TRUNC(SYSDATE) + 1
                    ORDER BY RECORD_DATE
                """, start_date=start_date)

                rows = cursor.fetchall()

        records = {}

        for row in rows:
            record_date = row[0].date()

            habits = [
                value == "Y"
                for value in row[1:7]
            ]

            records[record_date] = {
                "habits": habits,
                "water": int(row[7] or 0)
            }

        days = [
            date.today() - timedelta(days=i)
            for i in range(6, -1, -1)
        ]

        labels = []
        values = []

        for day in days:

            record = records.get(day, {})

            habits = record.get(
                "habits",
                [False] * 6
            )

            completed = sum(
                1 for value in habits if value
            )

            water = record.get("water", 0)

            score = round(
                (
                    completed
                    + (1 if water >= 8 else 0)
                ) / 7 * 100
            )

            labels.append(day.strftime("%a"))
            values.append(score)

        fig, ax = plt.subplots(figsize=(8, 3.5))

        ax.bar(labels, values)
        ax.set_ylim(0, 100)
        ax.set_ylabel("Daily progress (%)")
        ax.set_title("Daily Wellness Progress — Last 7 Days")
        ax.grid(axis="y", alpha=0.25)

        fig.tight_layout()

        output = io.BytesIO()

        fig.savefig(
            output,
            format="png",
            dpi=120
        )

        plt.close(fig)
        output.seek(0)

        return send_file(
            output,
            mimetype="image/png"
        )

    except Exception:
        app.logger.exception(
            "Could not create progress chart"
        )

        return (
            "Could not load progress chart from Oracle.",
            500
        )


# ==========================================
# 9. RUN FLASK APPLICATION
# ==========================================

if __name__ == "__main__":
    app.run(debug=True)
