import {
	openDropdown,
	closeDropdown,
	tryCorrectEmptyTextInput,
	filterVisibleOptions,
	clearHiddenOptions
} from './product-swatch-helpers';

const insertDropdownContainer = (field) => {
	const container = document.createElement('div');
	container.className = 'option-swatch-container';
	field.insertAdjacentElement('afterbegin', container);
	return container;
};
const popupateDropdownContainer = (field, container) => {
	Array.prototype.slice.call(field.querySelectorAll('label')).forEach(el => {
		el.setAttribute('data-title', el.children[0].title.toLowerCase());
		el.insertAdjacentElement('beforeend', document.getElementById(el.getAttribute('for')));
	});
	const options = Array.prototype.slice.call(field.children);
	
	options.forEach((child, i) => {
		if (i > 0) {
			container.appendChild(child);
		}
	});
};
const insertOptionPlaceholder = (field) => {
	const placeholder = document.createElement('div');
	placeholder.className = 'option-swatch-placeholder';
	field.insertAdjacentElement('afterbegin', placeholder);
	return placeholder;
};
const placeholderSwatchFactory = (placeholderLabel) => {
	const placeholderSwatch = document.createElement('span');
	placeholderSwatch.className = `form-option-variant form-option-variant--${placeholderLabel.match(/[Pp]attern/) ? 'pattern' : 'color'}`;
	return placeholderSwatch;
};

const placeholderTextFactory = (placeholderLabel) => {
	const placeholderText = document.createElement('input');
	const touchDevice = 'ontouchstart' in document;
	if (touchDevice) {
		placeholderText.disabled = true;
	}
	placeholderText.className = 'initial-value swatch-text';
	placeholderText.type = 'text';
	placeholderText.placeholder = `Select ${placeholderLabel.length > 0 ? placeholderLabel : 'Color'}`;
	return placeholderText;
};

const placeholderLabelFactory = (field) => {
	let placeholderLabel = '';
	if (field.previousElementSibling !== null && field.previousElementSibling.nodeName === 'LABEL') {
		placeholderLabel = field.previousElementSibling.textContent.substr(0, field.previousElementSibling.textContent.indexOf(':')).trim();
	}
	return placeholderLabel;
};

const populateOptionPlaceholder = (field, placeholder) => {
	placeholder.innerHTML = '';
	const placeholderLabel = placeholderLabelFactory(field);
	placeholder.appendChild(placeholderSwatchFactory(placeholderLabel));
	placeholder.appendChild(placeholderTextFactory(placeholderLabel));
};

const updateSelectedOption = (field, formOption) => {
	Array.prototype.slice.call(field.querySelectorAll('.selected-option')).forEach(el => {
		el.classList.remove('selected-option');
	});
	formOption.className += ' selected-option';
};

const updateOptionPlaceholder = (field, formOption) => {
	const placeholder = field.querySelector('.option-swatch-placeholder');
	const variantSpan = formOption.children[0];
	updateSelectedOption(field, formOption);

	placeholder.removeChild(placeholder.querySelector('.form-option-variant'));
	placeholder.insertAdjacentElement('afterbegin', variantSpan.cloneNode(true));
	placeholder.querySelector('input[type="text"]').value = variantSpan.title;

	const touchDevice = 'ontouchstart' in document;
	if (!touchDevice) {
		filterVisibleOptions(field, variantSpan.title.trim().toLowerCase());
	}
};

const fieldEvents = (field) => {
	const textInput = field.querySelector('input[type="text"]');
	textInput.addEventListener('blur', e => {
		const noTarget = e.relatedTarget === null;
		const touchDevice = 'ontouchstart' in document;
		if (noTarget && touchDevice) {
			closeDropdown(field, 200);
		}
	});
	textInput.addEventListener('keyup', e => {
		window.setTimeout(() => {
			filterVisibleOptions(field, e.target.value.trim().toLowerCase());
		}, 100);
	});
	field.addEventListener('click', () => {
		clearHiddenOptions(field);
		if (field.className.indexOf('is-open') === -1) {
			const touchDevice = 'ontouchstart' in document;
			if (touchDevice) {
				window.scrollTo(0, field.offsetTop);
			}
			openDropdown(field);
			return false;
		}
		tryCorrectEmptyTextInput(field, textInput);
		closeDropdown(field);
	});
	window.addEventListener('resize', () => {
		const touchDevice = 'ontouchstart' in document;
		const deviceOrientation = Math.abs(window.orientation) > 0 ? 'h' : 'v';
		const keyboardClosed = (deviceOrientation === 'h' && window.innerHeight > 319) || (deviceOrientation === 'v' && window.innerHeight > 399);
		if (touchDevice && keyboardClosed) {
			closeDropdown(field, 200);
			textInput.blur();
		}
	});
};
const containerEvents = (field, container) => {
	container.addEventListener('click', e => {
		// e.stopImmediatePropagation();
		let swatch = field.querySelector('.form-option');
		switch (e.target.nodeName) {
		case 'LABEL':
			swatch = e.target;
			break;
		case 'SPAN':
			swatch = e.target.parentElement;
			break;
		case 'INPUT':
			swatch = document.querySelector(`[for="${e.target.id}"]`);
			break;
		default:
			break;
		}
		updateOptionPlaceholder(field, swatch);
		closeDropdown(field);
	});
};

export const initSwatchDropdownOption = () => {
	if (document.querySelector('.form-field.swatch') !== null) {
		Array.prototype.slice.call(document.querySelectorAll('.form-field.swatch')).forEach((el, i) => {
			const field = el;
			field.className += ' color-swatch-dropdown';
			field.id = `color-swatch-dropdown-${i}`;
			field.insertAdjacentElement('beforebegin', field.querySelector('.form-label'));
			const container = insertDropdownContainer(field);
			popupateDropdownContainer(field, container);
			const placeholder = insertOptionPlaceholder(field);
			populateOptionPlaceholder(field, placeholder);
			// Attach events
			fieldEvents(field);
			containerEvents(field, container);
		}, this);
	}
};
