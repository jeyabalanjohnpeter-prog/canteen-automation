function getMoneyNumber(value) {
    const cleanedValue = String(value)
        .replace(/rs\.?/gi, "")
        .replace(/[^\d.-]/g, "");
    const number = Number(cleanedValue);
    return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
    return "Rs." + getMoneyNumber(value).toFixed(2);
}

window.getMoneyNumber = getMoneyNumber;
window.formatMoney = formatMoney;
