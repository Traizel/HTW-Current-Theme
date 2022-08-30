import { getCustomField } from './product-helpers';

const DEFAULT_CART_MESSAGES = {
	'dropship': (item) => (`This product is DROPSHIP ONLY. This item will be shipped${item.shippingMethod ? ` ${item.shippingMethod.toUpperCase()}`: ''} directly from ${item.brandName} separate from your order.`),
	'location': (item) => (`${item.location.toUpperCase()} ONLY product; will make your entire order ship${item.shippingMethod ? ` ${item.shippingMethod.toUpperCase()}`: ''} from our ${item.location} location.`),
	'shipping' : (item) => (`Ships${item.shippingMethod ? ` ${item.shippingMethod.toUpperCase()}`: 'GROUND'} ONLY and does not qualify for Next-Day or 2-Day Air even if that is chosen shipping method.`)
};

// use provided custom message or fallback to default message.
const getCartMessage = (item, messageType) => {
	return item[`${messageType}Message`] ? item[`${messageType}Message`] : DEFAULT_CART_MESSAGES[messageType](item);
};

const constructMessageBox = (msg) => {
	const alertBox = document.createElement('div');
	alertBox.className = 'alertBox alertBox--info';
	const alertIcon = document.createElement('div');
	alertIcon.className = 'alertBox-column alertBox-icon';
	alertIcon.innerHTML = `<icon glyph="ic-success" class="icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg></icon>`;
	const alertBoxMessage = document.createElement('p');
	alertBoxMessage.className = 'alertBox-column alertBox-message';
	alertBoxMessage.textContent = msg || 'nothing to see here';
	alertBox.appendChild(alertIcon);
	alertBox.appendChild(alertBoxMessage);
	return alertBox;
};

const insertCartNotifications = (id, messages) => {
	const cartRow = document.querySelector(`[data-id="${id}"]`);
	if (cartRow) {
		messages.forEach(msg => {
			cartRow.appendChild(constructMessageBox(msg));
		});
	}
};

const checkDropshipProduct = (item) => {
	const allDropship = item.dropshipColors.indexOf('all') > -1;
	if (!item.options) {
		return allDropship;
	}
	const isDropship = allDropship || item.options.reduce((acc, o) => {
		const starRegex = /[\s\d]\*$/;
		const hasStar = starRegex.test(o.value.trim());
		const inColorList = item.dropshipColors.indexOf(o.value.trim()) > -1;
		if (!acc && (hasStar || inColorList)) {
			acc = true;
		}
		return acc;
	}, false);
	return isDropship;
};

const checkLocationProduct = (item) => {
	const allLocationSpecific = item.locationColors.indexOf('all') > -1;
	if (!item.options) {
		return allLocationSpecific;
	}
	const isLocationSpecific = allLocationSpecific || item.options.reduce((acc, o) => {
		if (!acc && item.locationColors.indexOf(o.value) > -1) {
			acc = true;
		}
		return acc;
	}, false);
	return isLocationSpecific;
};

const checkGroundProduct = (item) => {
	const allGround = item.groundColors.indexOf('all') > -1;
	if (!item.options) {
		return allGround;
	}
	const isGround = allGround || item.options.reduce((acc, o) => {
		if (!acc && item.groundColors.indexOf(o.value) > -1) {
			acc = true;
		}
		return acc;
	}, false);
	return isGround;
};

const customCartItem = (cartItem) => {
	return Object.assign({
		id: cartItem.id,
		options: cartItem.options,
		brandName: cartItem.brand ? cartItem.brand.name : 'the manufacturer',
		location: getCustomField(cartItem, 'location', 'Winterfell'),
		proof: getCustomField(cartItem, 'proof', []),
		reorder: getCustomField(cartItem, 'reorder', []),
		dropshipColors: getCustomField(cartItem, 'dropship_colors', []),
		locationColors: getCustomField(cartItem, 'location_colors', []),
		groundColors: getCustomField(cartItem, 'ground_colors', []),
		shippingMethod: getCustomField(cartItem, 'shipping_method', null),
		dropshipMessage: getCustomField(cartItem, 'custom_dropship', null),
		locationMessage: getCustomField(cartItem, 'custom_location', null),
		shippingMessage: getCustomField(cartItem, 'custom_shipping', null)
	});
};

export const getCartMessages = (cartItems) => {
	return cartItems.map(item => {
		const cartItem = customCartItem(item);
		const messages = [];
		const isDropship = checkDropshipProduct(cartItem);
		if (isDropship) {
			messages.push(getCartMessage(cartItem, 'dropship'));
		}
		const isLocation = checkLocationProduct(cartItem);
		if (isLocation) {
			messages.push(getCartMessage(cartItem, 'location'));
		}
		const isGround = checkGroundProduct(cartItem);
		if (isGround) {
			messages.push(getCartMessage(cartItem, 'shipping'));
		}
		return {
			id: cartItem.id,
			messages
		};
	}).filter(cm => (cm.messages.length > 0));
};

export const applyCartMessages = (cartMessages) => {
	cartMessages.forEach(cm => {
		insertCartNotifications(cm.id, cm.messages);
	});
};

export const bubbleCartItemsWithMessages = () => {
	const cart = document.querySelector('.cart');
	if (cart) {
		Array.prototype.slice.call(cart.querySelectorAll('.cart-item')).forEach(row => {
			if (row.querySelector('.alertBox')) {
				cart.insertAdjacentElement('afterbegin', row);
			}
		});
	}
};

export const freeShippingMessage = (items, threshold) => {
	const subtotal = items.reduce((acc, item) => {
		acc += item.qty * item.unitPrice;
		return acc;
	}, 0);
	const alertBox = document.querySelector('.free-shipping-alert');
	if (alertBox) {
		alertBox.style.display = 'none';
		alertBox.className = 'alertBox free-shipping-alert';
		if (subtotal >= threshold) {
			alertBox.className += ' alertBox--success';
			alertBox.querySelector('.alertBox-message').innerText = 'You qualify for free shipping';
		} else {
			alertBox.className += ' alertBox--info';
			alertBox.querySelector('.alertBox-message').innerHTML = `Spend <strong>$${(threshold - subtotal).toFixed(2)}</strong> more to qualify for free shipping`;
		}
		alertBox.style.display = '';
	}
}
