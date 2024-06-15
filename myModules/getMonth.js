const axios = require("axios");

const m = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const d = new Date();
const year = d.getFullYear();
const month = d.getMonth();
const monthsMap = new Map();

async function fetchMonths() {
    const promises = [];
    for (let i = -4; i < 5; i++) {
        let currentYear;
        let monthIndex;

        if (month + i < 0) {
            currentYear = year - 1;
            monthIndex = 12 + (month + i);
        } else if (month + i >= 12) {
            currentYear = year + 1;
            monthIndex = (month + i) % 12;
        } else {
            currentYear = year;
            monthIndex = month + i;
        }

        const monthName = m[monthIndex];
        const monthKey = `${monthName}-${currentYear}`;

        // Check if monthKey is already fetched
        if (!monthsMap.has(monthKey)) {
            promises.push(
                axios.get(`https://calendar-json-app.adaptable.app/month/${monthName}?year=${currentYear}`)
                    .then((response) => {
                        response.data["id"] = i;
                        monthsMap.set(monthKey, response.data);
                    })
                    .catch((err) => {
                        console.error(`Error fetching data for ${monthName} ${currentYear}:`, err);
                    })
            );
        }
    }

    await Promise.all(promises);
    return Array.from(monthsMap.values());
}

module.exports = fetchMonths;