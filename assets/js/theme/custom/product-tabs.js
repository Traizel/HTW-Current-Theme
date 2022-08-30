import { asyncFetchProductBlogs } from './product-blogs';

const insertApplicationInstructions = (customFields=[]) => {
	const aiTab = document.getElementById('tab-application-instructions');
	const tabContentEmpty = aiTab && aiTab.childElementCount === 0;
	const applicationInstructions = customFields.filter(cf => {
		return cf.name.indexOf('application_instruction') > -1;
	}).map(cf => {
		const nameComponents = cf.name.split('_');
		const name = nameComponents[nameComponents.length - 1].toLowerCase();
		return {
			name,
			value: cf.value
		};
	});
	if (tabContentEmpty && applicationInstructions.length > 0) {
		const list = document.createElement('ul');
		list.className = 'application-instructions';
		applicationInstructions.forEach(cf => {
			const li = document.createElement('li');
			li.className = cf.name;
			li.textContent = cf.value;
			list.appendChild(li);
		}, this);
		aiTab.appendChild(list);
	}
	if (aiTab.querySelector('.application-instructions')) {
		showTab('application-instructions');
		return;
	}
	removeTab('application-instructions');
};

const productTabsMobileFix = () => {
	document.querySelector('.tabs-contents').addEventListener('click', e => {
		if (e.target.className === 'tab-title') {
			e.preventDefault();
			const targetTab = document.querySelector(`.tabs [data-${e.target.getAttribute('controls')}] a`);
			if (targetTab) {
				targetTab.click();
				window.scrollTo(0, document.querySelector('.tabs-contents').offsetTop);
				document.querySelector(`.mobile-tab[data-${e.target.getAttribute('controls')}]`).className += ' is-active';
			}
		}
	});
};

const showTab = (tabId) => {
	Array.prototype.slice.call(document.querySelectorAll(`[data-tab-${tabId}]`)).forEach(tab => {
		tab.style.display = '';
	});
};

const removeTab = (tabId) => {
	Array.prototype.slice.call(document.querySelectorAll(`[data-tab-${tabId}]`)).forEach(tab => {
		tab.parentElement.removeChild(tab);
	});
	const tabContent = document.getElementById(`tab-${tabId}`);
	if (tabContent) {
		tabContent.parentElement.removeChild(tabContent);
	}
};

const stripShippingFromPricing = (el) => {
	const shippingUl = el.querySelector('p + ul');
	if (shippingUl) {
		shippingUl.parentElement.removeChild(shippingUl);
	}
	return el;
};

const checkPricingTab = () => {
	const tabContent = document.getElementById('tab-pricing');
	if (tabContent.childElementCount === 0) {
		removeTab('pricing');
	}
};

const parseStringToArrayOfInts = (str) => {
	return typeof str == 'string' ? str.split(',').map(x => (parseInt(x.trim(), 10))).filter(x => (x)) : [];
};

export const tabulateProductDescription = (customFields) => {
	Array.prototype.slice.call(document.querySelectorAll('#tab-description .cf')).forEach(el => {
		const tabId = el.id.toLowerCase().trim();
		if (tabId === 'description') {
			return;
		}
		if (tabId === 'pricing') {
			el = stripShippingFromPricing(el);
		}
		const tab = document.querySelector(`[data-tab-${tabId}]`);
		const tabContent = document.getElementById(`tab-${tabId}`);
		if (tab && tabContent) {
			const tabContentAlreadyExists = tabContent.querySelector(`#${el.id}`) !== null;
			if (tabContentAlreadyExists) {
				el.parentElement.removeChild(el);
				return;
			}
			tab.style.display = '';
			tabContent.appendChild(el);
		}
	});
	checkPricingTab();
	insertApplicationInstructions(customFields);
	const blogPostIds = customFields ? customFields.filter(cf => (cf.name.toLowerCase().indexOf('blog') > -1)).map(cf => (parseStringToArrayOfInts(cf.value))) : []
	asyncFetchProductBlogs(blogPostIds);
	productTabsMobileFix();
};

export const shippingRestrictions = () => {
	const colors = Array.prototype.slice.call(document.querySelectorAll('.color-swatch-dropdown .form-option-variant--color'));
	const shippingRestrictions = document.querySelector('.shipping-restrictions');
	const hasShippingRestrictions = shippingRestrictions !== null && shippingRestrictions.childElementCount > 0;
	if (colors.length > 0 || hasShippingRestrictions) {
		const exclusiveColor = colors.reduce((acc, field) => {
			if (acc) {
				return acc;
			}
			acc = field.title.match(/\*\*$/) !== null;
			return acc;
		}, false);
		const dropshipColor = colors.reduce((acc, field) => {
			if (acc) {
				return acc;
			}
			acc = field.title.match(/\d\*$/) !== null;
			return acc;
		}, false);
		if (exclusiveColor && shippingRestrictions.querySelector('.htw_exclusive') === null) {
			const exclusiveColorLi = document.createElement('li');
			exclusiveColorLi.className = 'htw_exclusive';
			exclusiveColorLi.innerHTML = 'Colors marked with ** represents <strong>custom HTW colors</strong> that are only available from HTW.';
			shippingRestrictions.appendChild(exclusiveColorLi);
		}
		if (dropshipColor && shippingRestrictions.querySelector('.dropship_color') === null) {
			const dropshipColorLi = document.createElement('li');
			dropshipColorLi.className = 'dropship_color';
			dropshipColorLi.innerHTML = 'Colors marked with * represents a <strong>DROPSHIP COLOR</strong>. This material will be shipped directly from the manufacturer separate from your order.';
			shippingRestrictions.appendChild(dropshipColorLi);
		}
		if (hasShippingRestrictions) {
			showTab('shipping');
		}
	}
};
