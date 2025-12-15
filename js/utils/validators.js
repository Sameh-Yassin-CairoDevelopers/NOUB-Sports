/*
 * Filename: js/utils/validators.js
 * Description: Helper functions to validate user input.
 */



export const Validators = {
    isValidName: (name) => {
        return name && name.length >= 3 && name.length <= 15;
    },
    isValidPosition: (pos) => {
        return ['FWD', 'MID', 'DEF', 'GK'].includes(pos);
    }
};

