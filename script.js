
// =====================================
// DAILY HEALTH & WELLNESS
// JavaScript + Flask + Oracle Database
// =====================================

// 1. DATE AND LOCAL STORAGE

function getTodayDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

const today = getTodayDate();
const waterStorageKey = "wellnessWater_" + today;
const habitsStorageKey = "wellnessHabits_" + today;

// 2. HABIT TRACKER

const habitCheckboxes = document.querySelectorAll(
    "#routine input[type='checkbox']"
);

const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const progressBar = document.getElementById("progressBar");
const resetHabitsButton = document.getElementById("resetHabits");

function loadHabits() {
    let savedHabits = [];

    try {
        savedHabits = JSON.parse(
            localStorage.getItem(habitsStorageKey) || "[]"
        );
    } catch (error) {
        savedHabits = [];
    }

    habitCheckboxes.forEach(function (checkbox, index) {
        checkbox.checked = savedHabits[index] === true;
    });
}

function saveHabits() {
    const completedHabits = Array.from(habitCheckboxes).map(
        checkbox => checkbox.checked
    );

    localStorage.setItem(
        habitsStorageKey,
        JSON.stringify(completedHabits)
    );
}

function getCompletedHabits() {
    return Array.from(habitCheckboxes).filter(
        checkbox => checkbox.checked
    ).length;
}

function updateHabitProgress() {
    const totalHabits = habitCheckboxes.length;
    const completedHabits = getCompletedHabits();

    const percentage = totalHabits > 0
        ? (completedHabits / totalHabits) * 100
        : 0;

    if (progressText) {
        progressText.textContent =
            completedHabits + " of " + totalHabits + " habits completed";
    }

    if (progressFill) {
        progressFill.style.width = percentage + "%";
    }

    if (progressBar) {
        progressBar.setAttribute("aria-valuemax", totalHabits);
        progressBar.setAttribute("aria-valuenow", completedHabits);
    }

    updateDashboard();
}

habitCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
        saveHabits();
        updateHabitProgress();
        scheduleSaveToPythonBackend();
    });
});

if (resetHabitsButton) {
    resetHabitsButton.addEventListener("click", function () {
        habitCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        saveHabits();
        updateHabitProgress();
        scheduleSaveToPythonBackend();
    });
}

// 3. WATER TRACKER

const waterTarget = 8;
const waterCountElement = document.getElementById("waterCount");
const waterFill = document.getElementById("waterFill");
const waterMessage = document.getElementById("waterMessage");
const addWaterButton = document.getElementById("addWater");
const removeWaterButton = document.getElementById("removeWater");

let waterCount = Number(localStorage.getItem(waterStorageKey)) || 0;
waterCount = Math.max(0, Math.min(waterCount, waterTarget));

function updateWaterTracker() {
    if (waterCountElement) {
        waterCountElement.textContent = waterCount;
    }

    const percentage = (waterCount / waterTarget) * 100;

    if (waterFill) {
        waterFill.style.width = percentage + "%";
    }

    if (waterMessage) {
        if (waterCount === 0) {
            waterMessage.textContent =
                "Start tracking your water intake today!";
        } else if (waterCount < waterTarget) {
            waterMessage.textContent =
                "You have tracked " + waterCount + " glasses today.";
        } else {
            waterMessage.textContent =
                "Your tracking target is complete! Great job!";
        }
    }

    localStorage.setItem(waterStorageKey, String(waterCount));
    updateDashboard();
}

if (addWaterButton) {
    addWaterButton.addEventListener("click", function () {
        if (waterCount < waterTarget) {
            waterCount++;
            updateWaterTracker();
            scheduleSaveToPythonBackend();
        } else if (waterMessage) {
            waterMessage.textContent =
                "You have reached your tracking target.";
        }
    });
}

if (removeWaterButton) {
    removeWaterButton.addEventListener("click", function () {
        if (waterCount > 0) {
            waterCount--;
            updateWaterTracker();
            scheduleSaveToPythonBackend();
        }
    });
}

// 4. DASHBOARD

const dashboardHabits = document.getElementById("dashboardHabits");
const dashboardWater = document.getElementById("dashboardWater");
const overallProgress = document.getElementById("overallProgress");

function updateDashboard() {
    const totalHabits = habitCheckboxes.length;
    const completedHabits = getCompletedHabits();

    if (dashboardHabits) {
        dashboardHabits.textContent =
            completedHabits + " / " + totalHabits;
    }

    if (dashboardWater) {
        dashboardWater.textContent =
            waterCount + " / " + waterTarget + " glasses";
    }

    const totalTasks = totalHabits + 1;
    const completedTasks = completedHabits +
        (waterCount >= waterTarget ? 1 : 0);

    const percentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    if (overallProgress) {
        overallProgress.textContent = percentage + "%";
    }
}

// 5. DARK MODE

const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
    const darkMode = theme === "dark";

    document.body.classList.toggle("dark-mode", darkMode);

    if (themeToggle) {
        themeToggle.textContent = darkMode
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";

        themeToggle.setAttribute("aria-pressed", String(darkMode));
    }
}

const savedTheme = localStorage.getItem("wellnessTheme") || "light";
applyTheme(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener("click", function () {
        const isDark = document.body.classList.contains("dark-mode");
        const newTheme = isDark ? "light" : "dark";

        localStorage.setItem("wellnessTheme", newTheme);
        applyTheme(newTheme);
    });
}

// 6. RANDOM WELLNESS TIPS

const wellnessTips = [
    "💧 Drink water regularly throughout your day.",
    "🍎 Include fruits and vegetables in your meals.",
    "😴 Maintain a regular sleep schedule.",
    "🏃 Include physical activity in your daily routine.",
    "🧘 Take short breaks to relax your mind.",
    "🥗 Try to eat balanced and varied meals.",
    "📵 Take breaks from screens when possible."
];

const tipButton = document.getElementById("tipButton");
const message = document.getElementById("message");

if (tipButton) {
    tipButton.addEventListener("click", function () {
        const randomIndex = Math.floor(
            Math.random() * wellnessTips.length
        );

        if (message) {
            message.textContent = wellnessTips[randomIndex];
        }
    });
}

// 7. MOBILE NAVIGATION

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
        const isOpen = mainNav.classList.toggle("nav-open");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            mainNav.classList.remove("nav-open");
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });
}

// 8. PERSONALIZED DIET PLAN

const dietPreference = document.getElementById("dietPreference");
const generateDietButton = document.getElementById("generateDiet");
const dietResults = document.getElementById("dietResults");

const dietPlans = {
    veg: {
        title: "🥦 Vegetarian Diet Plan",
        meals: [
            ["🌅 Breakfast", "Poha or oats with milk and fruit"],
            ["🍱 Lunch", "Dal, roti, seasonal vegetables and curd"],
            ["🍎 Evening Snacks", "Fresh fruit and a handful of nuts"],
            ["🌙 Dinner", "Paneer or beans with roti and vegetables"]
        ]
    },

    nonveg: {
        title: "🍗 Non-Vegetarian Diet Plan",
        meals: [
            ["🌅 Breakfast", "Eggs with whole-wheat toast and fruit"],
            ["🍱 Lunch", "Chicken, roti or rice, and vegetables"],
            ["🍎 Evening Snacks", "Fresh fruit and yogurt"],
            ["🌙 Dinner", "Fish or chicken with rice or roti and vegetables"]
        ]
    },

    egg: {
        title: "🥚 Eggetarian Diet Plan",
        meals: [
            ["🌅 Breakfast", "Boiled eggs with whole-wheat toast"],
            ["🍱 Lunch", "Dal, roti, vegetables and curd"],
            ["🍎 Evening Snacks", "Fruit and a handful of nuts"],
            ["🌙 Dinner", "Vegetable pulao with eggs or paneer"]
        ]
    }
};

if (generateDietButton && dietPreference && dietResults) {
    generateDietButton.addEventListener("click", function () {
        const selectedPlan = dietPlans[dietPreference.value];

        if (!selectedPlan) {
            dietResults.textContent = "Please select a food preference.";
            return;
        }

        const heading = document.createElement("h3");
        heading.textContent = selectedPlan.title;

        const mealsContainer = document.createElement("div");
        mealsContainer.className = "diet-meals";

        selectedPlan.meals.forEach(function (meal) {
            const mealCard = document.createElement("div");
            mealCard.className = "diet-meal";

            const mealHeading = document.createElement("h4");
            mealHeading.textContent = meal[0];

            const mealText = document.createElement("p");
            mealText.textContent = meal[1];

            mealCard.appendChild(mealHeading);
            mealCard.appendChild(mealText);
            mealsContainer.appendChild(mealCard);
        });

        dietResults.replaceChildren(heading, mealsContainer);
    });
}

// 9. INITIALIZE LOCAL TRACKERS

loadHabits();
updateWaterTracker();
updateHabitProgress();

// 10. PYTHON / FLASK / ORACLE DATABASE SYNC

const moodInput = document.getElementById("moodInput");
const sleepInput = document.getElementById("sleepInput");
const activityInput = document.getElementById("activityInput");
const wellnessForm = document.getElementById("wellnessForm");
const saveStatus = document.getElementById("saveStatus");

let loadingFromBackend = true;
let saveTimer = null;

function currentWellnessData() {
    return {
        habits: Array.from(habitCheckboxes).map(
            checkbox => checkbox.checked
        ),
        water: waterCount,
        mood: moodInput ? moodInput.value : "Okay",
        sleep: Number(sleepInput ? sleepInput.value || 0 : 0),
        activity: Number(activityInput ? activityInput.value || 0 : 0)
    };
}

async function saveToPythonBackend() {
    if (loadingFromBackend) return;

    try {
        if (saveStatus) {
            saveStatus.textContent = "Saving to Oracle Database...";
        }

        const response = await fetch("/api/today", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(currentWellnessData())
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || "Save failed");
        }

        if (saveStatus) {
            saveStatus.textContent = "✅ Saved to Oracle Database";
        }

        const chart = document.getElementById("progressChart");

        if (chart) {
            chart.src = "/progress-chart.png?t=" + Date.now();
        }
    } catch (error) {
        console.error("Could not save wellness record:", error);

        if (saveStatus) {
            saveStatus.textContent =
                "Could not save. Check that app.py is running and Oracle is connected.";
        }
    }
}

function scheduleSaveToPythonBackend() {
    if (loadingFromBackend) return;

    clearTimeout(saveTimer);

    saveTimer = setTimeout(function () {
        saveToPythonBackend();
    }, 300);
}

async function loadFromPythonBackend() {
    try {
        const response = await fetch("/api/today");

        if (!response.ok) {
            throw new Error("Could not load today's record");
        }

        const data = await response.json();

        if (Array.isArray(data.habits)) {
            habitCheckboxes.forEach(function (checkbox, index) {
                checkbox.checked = data.habits[index] === true;
            });

            saveHabits();
        }

        if (Number.isFinite(Number(data.water))) {
            waterCount = Math.max(
                0,
                Math.min(Number(data.water), waterTarget)
            );

            localStorage.setItem(waterStorageKey, String(waterCount));
        }

        if (moodInput && data.mood) {
            moodInput.value = data.mood;
        }

        if (sleepInput && data.sleep !== undefined) {
            sleepInput.value = data.sleep;
        }

        if (activityInput && data.activity !== undefined) {
            activityInput.value = data.activity;
        }

        updateWaterTracker();
        updateHabitProgress();

        if (saveStatus) {
            saveStatus.textContent = "✅ Data loaded from Oracle Database";
        }
    } catch (error) {
        console.error("Could not load wellness record:", error);

        if (saveStatus) {
            saveStatus.textContent =
                "Could not load data. Check that app.py is running and Oracle is connected.";
        }
    } finally {
        loadingFromBackend = false;
    }
}

if (moodInput) {
    moodInput.addEventListener("change", scheduleSaveToPythonBackend);
}

if (sleepInput) {
    sleepInput.addEventListener("change", scheduleSaveToPythonBackend);
}

if (activityInput) {
    activityInput.addEventListener("change", scheduleSaveToPythonBackend);
}

if (wellnessForm) {
    wellnessForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearTimeout(saveTimer);
        saveToPythonBackend();
    });
}

// Load today's Oracle record when the page opens
loadFromPythonBackend();
