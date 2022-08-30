import $ from 'jquery';

const formatPatternName = (pattern) => {
	if (pattern === undefined) {
		return '';
	}
	return pattern.toString().trim().toLowerCase().replace(/\W/g, ' ').replace(/\s+/g, '_');
};
const formatColorCode = (element, isForeground) => {
	if (element === undefined) {
		return isForeground ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
	}
	if (isForeground) {
		return element.style.backgroundColor || 'rgb(0, 0, 0)';
	}
	return element.style.backgroundColor || 'rgb(255, 255, 255)';
};
const showPatternCanvas = (patternCanvas) => {
	if (patternCanvas) {
		patternCanvas.style.display = 'block';
		patternCanvas.classList.add('loaded');
		patternCanvas.classList.remove('hide');
	}
};
const hidePatternCanvas = (patternCanvas) => {
	if (patternCanvas) {
		patternCanvas.style.display = 'none';
		patternCanvas.classList.add('hide');
		patternCanvas.classList.remove('loaded');
	}
};
const localStorageUpdateCustomVinylDisplay = (patternCanvas, vinylOptions) => {
	patternCanvas.setAttribute('data-pattern', vinylOptions.pattern);
	patternCanvas.innerHTML = localStorage.getItem(`pattern_${vinylOptions.pattern}`);
	patternCanvas.style.backgroundColor = vinylOptions.background;
	if (patternCanvas.querySelector('polygon:first-child') !== null) {
		patternCanvas.querySelector('polygon:first-child').style.fill = vinylOptions.background;
	}
	patternCanvas.style.fill = vinylOptions.foreground;
	showPatternCanvas(patternCanvas);
};
const ajaxUpdateCustomVinylDisplay = (patternCanvas, vinylOptions) => {
	$.ajax({
		url: `https://www.heattransferwarehouse.com/product_images/vector_patterns/${vinylOptions.pattern}.svg`
	}).done(data => {
		if (!data) {
			hidePatternCanvas(patternCanvas);
			return false;
		}
		patternCanvas.setAttribute('data-pattern', vinylOptions.pattern);
		patternCanvas.innerHTML = new XMLSerializer().serializeToString(data.documentElement);
		patternCanvas.style.backgroundColor = vinylOptions.background;
		if (patternCanvas.querySelector('polygon:first-child') !== null) {
			patternCanvas.querySelector('polygon:first-child').style.fill = vinylOptions.background;
		}
		patternCanvas.style.fill = vinylOptions.foreground;
		showPatternCanvas(patternCanvas);
	});
};
export const createVinylOptions = () => {
	const patternOption = document.querySelector('.form-option-variant--pattern');
	const foregroundOption = document.querySelector('.form-option-variant--color');
	const backgroundOption = Array.prototype.slice.call(document.querySelectorAll('.color-swatch-dropdown')).reduce((acc, el) => {
		if (el.previousElementSibling.nodeName === 'LABEL' && el.previousElementSibling.textContent.toLowerCase().indexOf('background') > -1) {
			acc = el.querySelector('.form-option-variant--color');
		}
		return acc;
	}, foregroundOption);
	return {
		pattern: patternOption ? formatPatternName(patternOption.title) : '',
		foreground: foregroundOption ? formatColorCode(foregroundOption, true) : 'rgb(0, 0, 0)',
		background: backgroundOption ? formatColorCode(backgroundOption) : 'rgb(255, 255, 255)'
	};
};
export const updateCustomVinylDisplay = (el, options) => {
	const patternCanvas = el || document.getElementById('pattern-canvas');
	if (patternCanvas) {
		const vinylOptions = options || createVinylOptions();
		const patternChanged = patternCanvas.getAttribute('data-pattern') !== vinylOptions.pattern;
		if (vinylOptions.pattern === '') {
			hidePatternCanvas(patternCanvas);
			return false;
		}
		if (!patternCanvas.querySelector('svg') || patternChanged) {
			if (localStorage.getItem(`pattern_${vinylOptions.pattern}`)) {
				localStorageUpdateCustomVinylDisplay(patternCanvas, vinylOptions);
			}
			ajaxUpdateCustomVinylDisplay(patternCanvas, vinylOptions);
			return false;
		}
		patternCanvas.style.backgroundColor = vinylOptions.background;
		if (patternCanvas.querySelector('polygon:first-child')) {
			patternCanvas.querySelector('polygon:first-child').style.fill = vinylOptions.background;
		}
		patternCanvas.style.fill = vinylOptions.foreground;
		showPatternCanvas(patternCanvas);
	}
};
export const initCustomPatternedVinyl = (selector, productPage) => {
	const productImage = document.querySelector(selector);
	if (productImage) {
		const patternCanvas = document.createElement('div');
		if (productPage) {
			patternCanvas.id = 'pattern-canvas';
		}
		patternCanvas.className = 'pattern-canvas';
		patternCanvas.style.display = 'none';
		productImage.insertAdjacentElement('afterbegin', patternCanvas);
		return patternCanvas;
	}
};
export const updateCartThumbnails = (selector, cartItems=[]) => {
	cartItems.forEach(item => {
		const row = document.querySelector(`${selector} [data-id="${item.id}"]`);
		if (!row) {
			return;
		}
		const productId = parseInt(row.getAttribute('data-product-id'), 10);
		// product is 2 color custom vinyl
		if ([4827, 4829].indexOf(productId) > -1) {
			const imgContainer = row.querySelector('img').parentElement;
			const containerSelector = `${selector} [data-id="${item.id}"] .${imgContainer.className.split(' ').join('.')}`;
			const patternCanvas = initCustomPatternedVinyl(containerSelector);
			updateCustomVinylDisplay(patternCanvas, item.vinylOptions);
		}
	});
};
