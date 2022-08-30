
const scaffoldToolTip = (content) => {
	const tooltip = document.createElement('div');
	const tooltipHandle = document.createElement('i');
	const tooltipPanel = document.createElement('div');
	tooltip.appendChild(tooltipHandle);
	tooltip.appendChild(tooltipPanel);
	tooltip.className = 'ec-tooltip';
	tooltipHandle.className = 'ec-tooltip__handle icon';
	tooltipHandle.innerHTML = '<svg><use xlink:href="#icon-info" /></svg>';
	tooltipPanel.className = 'ec-tooltip__panel';
	if (content !== undefined) {
		if (typeof content === 'object') {
			tooltipPanel.appendChild(content);
		} else {
			tooltipPanel.textContent = content.toString().split('.').filter(t => {
				const re = /CDATA/;
				return !re.test(t);
			}).join('.');
		}
	}
	return tooltip;
};

const GenerateTooltipList = (title, list) => {
	const outer = document.createElement('div');
	const p = document.createElement('p');
	p.textContent = title;
	const ul = document.createElement('ul');
	list.forEach(item => {
		const li = document.createElement('li');
		li.textContent = item;
		ul.appendChild(li);
	});
	outer.appendChild(p);
	outer.appendChild(ul);
	return outer;
};

const insertTooltip = (target, position, tooltip) => {
	const targetEl = typeof target === 'object' ? target : document.querySelector(target);
	targetEl.insertAdjacentElement(position, tooltip);
};

const getChildElementFromString = (collection, re) => {
	if (collection !== undefined && collection.children.length < 1) {
		return collection;
	}
	const children = Array.prototype.slice.call(collection.children).filter(child => re.test(child.textContent));
	if(children.length !== 1) {
		return collection;
	}
	return getChildElementFromString(children[0], re);
};

export const priceTooltip = () => {
	const pricing = document.getElementById('Pricing');
	const re = /\s=\s\$\d/;
	if (pricing !== null && re.test(pricing.textContent)) {
		const pricingChildEl = getChildElementFromString(pricing, re);
		const tooltip = scaffoldToolTip(pricingChildEl.cloneNode(true));
		insertTooltip('.productView-price .price-label', 'beforeend', tooltip);
		return false;
	}
};

export const supacolorTooltip = (reorder, proof) => {
	const targetDiv = document.querySelector('.form-label.form-label--alternate.form-label--inlineSmall');
	const targetDiv2 = document.querySelector('.form-field.set-rectangle');
	const targetDiv3 = document.querySelector('.form-field.is-srOnly.set-select');
	if (targetDiv !== null || targetDiv2 !== null || targetDiv3 !== null) {
		if (reorder[0]) {
			let orderContent = `A reorder is defined as the artwork is exactly the same as the previous time ordered. Meaning the artwork itself, size of the artwork, type of transfers and design are all the same. The only thing that can change will be the quantity. The information we will need is the order number you would like to reorder.`;
			const supacolorTooltip = scaffoldToolTip(orderContent);
			insertTooltip(targetDiv2.firstElementChild, 'beforeend', supacolorTooltip);
			orderContent = `A proof is a visual representation of how your artwork will be printed. Each design is sized proportionally to the requested sheet, unless otherwise specified. All proofs will be presented in CMYK, which may alter any artwork submitted in a different color mode. All artwork submitted must be vector or a high resolution image without a background.`;
			const supacolorTooltip2 = scaffoldToolTip(orderContent);
			const sender = targetDiv3.previousElementSibling
			insertTooltip(sender.firstElementChild, 'beforeend', supacolorTooltip2);
			return false;
		}
		if (proof[0]) {
			let proofContent = `A proof is a visual representation of how your artwork will be printed. Each design is sized proportionally to the requested sheet, unless otherwise specified. All proofs will be presented in CMYK, which may alter any artwork submitted in a different color mode. All artwork submitted must be vector or a high resolution image without a background.`;
			const proofTooltip = scaffoldToolTip(proofContent);
			insertTooltip(targetDiv, 'beforeend', proofTooltip);
			return false;
		}
	}
};

export const patternVinylTooltip = (mask) => {
	const targetDiv = document.querySelector('.form-field.set-rectangle');
	if (targetDiv !== null && mask[0]) {
			let patternContent = `Why need mask? Our patterns are printed in-house, they require a heat transfer mask to transfer them onto your garment after they have been cut and weeded. Check out the video link below the mask options`;
			const sender = targetDiv.nextElementSibling
			const patternTooltip = scaffoldToolTip(patternContent);
			insertTooltip(sender.firstElementChild, 'beforeend', patternTooltip);
			return false;
	}
};

export const colorTooltip = (isDropship, dropshipColors, locationColors) => {
	const colors = document.querySelector('.form-field.swatch');
	const targetDiv = colors !== null ? colors : document.querySelector('.form-field--increments');
	if (targetDiv !== null) {
		if (!isDropship && dropshipColors.length > 0) {
			let dropshipContent = isDropship ? `ALL colors are DROPSHIP ONLY. This product will be sent from ${brand} and will ship separately from your order.` : GenerateTooltipList('Dropship Colors:', dropshipColors);
			const dropshipTooltip = scaffoldToolTip(dropshipContent);
			insertTooltip(targetDiv.previousElementSibling, 'beforeend', dropshipTooltip);
			return false;
		}
		if (locationColors.length > 0 && locationColors.length !== targetDiv.querySelectorAll('.form-option').length) {
			let locationContent = GenerateTooltipList('Location Specific Colors:', locationColors);
			const locationTooltip = scaffoldToolTip(locationContent);
			insertTooltip(targetDiv.previousElementSibling, 'beforeend', locationTooltip);
			return false;
		}
	}
};
