import $ from 'jquery';

export const productBrand = () => {
	const brandEl = document.querySelector('[itemprop="brand"] span');
	return brandEl !== null ? brandEl.innerText.trim() : 'the manufacturer';
};

const closeCustomModal = () => {
	document.documentElement.classList.remove('custom-form-modal-open');
};

const cleanUpForm = () => {
	const dragAndDropForm = document.getElementById('drag-drop-form');
	if (dragAndDropForm !== null && dragAndDropForm.className.indexOf('is-success') > -1) {
		dragAndDropForm.setAttribute('data-current-step', 1);
		dragAndDropForm.classList.remove('is-success');
	}
};

export const listenCustomModalClose = () => {
	const customFormModal = document.querySelector('.custom-form-modal');
	if (customFormModal !== null) {
		Array.prototype.slice.call(document.querySelectorAll('.modal-control')).forEach(button => {
			button.addEventListener('click', e => {
				e.preventDefault();
				e.stopPropagation();
				closeCustomModal();
				window.setTimeout(cleanUpForm, 1000);
			});
		});
		document.body.addEventListener('keyup', e => {
			if (e.keyCode === 27) {
				e.preventDefault();
				e.stopPropagation();
				closeCustomModal();
				window.setTimeout(cleanUpForm, 1000);
			}
		});
	}
};

export const applyFieldAttributeNames = () => {
	Array.prototype.slice.call(document.querySelectorAll('.form-field')).forEach(el => {
		el.className += ` ${el.getAttribute('data-product-attribute')}`;
	});
};

export const bundleProductAttributes = () => {
	return Array.prototype.slice.call(document.querySelectorAll('.form-field.swatch')).reduce(field => {
		const label = field.previousElementSibling.innerText.trim();
		const labelText = label.substr(0, label.indexOf(':')).toLowerCase();
		const swatch = field.querySelector('.form-option-variant');
		if (swatch.className.indexOf('pattern') > -1) {
			acc[labelText] = swatch.style.backgroundImage.split('"')[1];
		} else {
			acc[labelText] = swatch.style.backgroundColor;
		}
		return acc;
	}, {});
};

export const activateProductAttributesFromUrl = () => {
	const re = /attributes=([0-9,]+)/;
	if (re.test(window.location.search)) {
		const matches = window.location.search.match(re);
		const attrs = matches[matches.length-1].split(',');
		attrs.forEach(a => {
			const input = document.querySelector(`input[value="${a}"]`);
			if (isNaN(parseInt(a)) || !input) {
				return false;
			}
			input.click();
		});
	}
};

export const snakecase = (string) => {
	return string.toLowerCase().replace(/\W/g, '_');
};

export const addCommas = (x) => {
	var xParts = parseFloat(x).toFixed(2).toString().split('.');
	xParts[0] = xParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return xParts.length > 1 ? xParts.join('.') : xParts[0];
};

export const getCustomField = (item, fieldName, defaultValue) => {
	const customFields = item['custom_fields'] || item.customFields;
	if (!customFields) {
		return [];
	}
	return customFields.reduce((acc, cf) => {
		if (snakecase(cf.name) === fieldName) {
			if (acc === null || typeof acc === 'string') {
				acc = cf.value;
			} else {
				acc = acc.concat(cf.value.split(',').map(v => (v.trim())));
			}
		}
		return acc;
	}, defaultValue);
};

const asyncFetchProductSwatches = (id) => {
	if (window.__productSwatches[id]) {
		applyProductSwatches(id, window.__productSwatches[id]);
		return;
	}
	const api_base_url = 'https://api.heattransferwarehouse.com';
	$.ajax({
		url: `${api_base_url}/htw/products/${id}/swatches`,
		complete: data => {
			if (data.status < 300) {
				const responseJSON = data.responseJSON || JSON.parse(data.responseText);
				if (responseJSON.length > 0) {
					applyProductSwatches(id, responseJSON);
					window.__productSwatches[id] = responseJSON;
				}
			}
		},
	});
};

const applyProductSwatches = (id, swatches) => {
	const card = document.querySelector(`[data-entity-id="${id}"]`);
	if (card === null) {
		return false;
	}
	swatches = shuffle(swatches);
	insertSwatchContainer(card);
	const maxPreviewCount = Math.min(swatches.length, 4);
	for (let i = 0; i < maxPreviewCount; i++) {
		insertSwatch(card, swatches[i]);
	}
	if (swatches.length > maxPreviewCount) {
		insertSwatchMoreCount(card, swatches.length - maxPreviewCount);
	}
};

const insertSwatchContainer = (el) => {
	if (el.querySelector('.swatch-container')) {
		return;
	}
	const container = document.createElement('div');
	container.className = 'swatch-container';
	el.querySelector('.card-title').insertAdjacentElement('afterend', container);
};

const insertSwatch = (card, swatch) => {
	const swatchIsImg = swatch.value.indexOf('preview') > -1;
	const swatchSpan = document.createElement('span');
	swatchSpan.className = swatchIsImg ? 'swatch img' : 'swatch hex';
	swatchSpan.title = swatch.label;
	if (swatchIsImg) {
		swatchSpan.style.backgroundImage = swatch.value.indexOf('https://') > -1 ? swatch.value : `url(https://cdn11.bigcommerce.com/s-et4qthkygq/images/stencil/20x20/attribute_value_images/${swatch.value})`;
	} else {
		swatchSpan.style.backgroundColor = swatch.value;
	}
	card.querySelector('.swatch-container').appendChild(swatchSpan)
};

const insertSwatchMoreCount = (card, count) => {
	const moreSpan = document.createElement('span');
	moreSpan.className = 'tag more-tag';
	moreSpan.textContent = `+${count} more`;
	card.querySelector('.swatch-container').appendChild(moreSpan)
};

/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/2450976/1293256
 * @param  {Array} array The array to shuffle
 * @return {Array} array The array shuffled
 */
const shuffle = (array) => {
	let currentIndex = array.length;
	let temporaryValue, randomIndex;
	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
};

export const fetchProductSwatches = (productIds=[]) => {
	window.__productSwatches = {};
	productIds.forEach(id => {
		asyncFetchProductSwatches(id);
	});
};

export const refreshProductSwatches = () => {
	Array.prototype.slice.call(document.querySelectorAll('.card')).map(el => (parseInt(el.getAttribute('data-entity-id')))).filter(id => (id)).forEach(id => {
		asyncFetchProductSwatches(id);
	});
};
