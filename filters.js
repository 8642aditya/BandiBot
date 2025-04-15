const prism = require('prism-media');

let isBassBoosted = false;
let isNightcore = false;
let isVaporwave = false;

function applyFilter(stream) {
    let filterStream = stream;

    // Apply Bass Boost
    if (isBassBoosted) {
        filterStream = filterStream.pipe(new prism.BassBoost());
    }

    // Apply Nightcore (speed up the song)
    if (isNightcore) {
        filterStream = filterStream.pipe(new prism.Speed(1.2)); // Increase speed by 20%
    }

    // Apply Vaporwave (slow down the song)
    if (isVaporwave) {
        filterStream = filterStream.pipe(new prism.Speed(0.8)); // Decrease speed by 20%
    }

    return filterStream;
}

// Toggle functions
function toggleBassBoost() {
    isBassBoosted = !isBassBoosted;
    return isBassBoosted;
}

function toggleNightcore() {
    isNightcore = !isNightcore;
    return isNightcore;
}

function toggleVaporwave() {
    isVaporwave = !isVaporwave;
    return isVaporwave;
}

module.exports = {
    applyFilter,
    toggleBassBoost,
    toggleNightcore,
    toggleVaporwave,
};
