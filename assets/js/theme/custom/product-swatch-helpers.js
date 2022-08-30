export const openDropdown = (el) => {
	el.className += ' is-open is-focused';
};
export const closeDropdown = (el, timeout) => {
	window.setTimeout(() => {
		el.className = el.className.replace(/\s*is-(open)?(focused)?/g, '');
	}, timeout || 100);
};
export const tryCorrectEmptyTextInput = (field, input) => {
	const selectedValue = field.querySelector('.form-option.selected-option');
	if (selectedValue === null) {
		input.value = '';
		input.previousElementSibling.title = '';
		input.previousElementSibling.style.backgroundImage = '';
		return false;
	}
	input.value = selectedValue.querySelector('.form-option-variant').title;
};
export const filterVisibleOptions = (field, query) => {
	Array.prototype.slice.call(field.querySelectorAll('.option-swatch-container .form-option')).forEach(el => {
		if (el.getAttribute('data-title') !== null) {
			if (el.getAttribute('data-title').indexOf(query) === -1) {
				el.className += ' hide';
			} else {
				el.className = el.className.replace(/\s?hide/g, '');
			}
		}
	});
};
export const clearHiddenOptions = (field) => {
	Array.prototype.slice.call(field.querySelectorAll('.form-option.hide')).forEach(el => {
		el.className = el.className.replace(/\s?hide/g, '');
	});
};
