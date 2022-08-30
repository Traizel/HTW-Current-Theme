export default class LocalCart {
	constructor() {
		const customerLoggedOut = this.didCustomerLogOut();
		if (customerLoggedOut) {
			this.deleteLocalCart();
		} else {
			this.getLocalCart = this.getLocalCart.bind(this);
			this.updateLocalCart = this.updateLocalCart.bind(this);
			this.buildCartItemsFromPage = this.buildCartItemsFromPage.bind(this);
			this.items = this.getLocalCart();
			this.qty = this.updateQuantity(this.items);
		}
	}
	didCustomerLogOut() {
		return Array.prototype.slice.call(document.querySelectorAll('.alertBox-message')).reduce((acc, msg) => {
			const re = /logged\sout/g;
			if (!acc && re.test(msg.innerText.toLowerCase())) {
				acc = true;
			}
			return acc;
		}, false);
	}
	getLocalCart() {
		return JSON.parse(localStorage.getItem('__localcart')) || [];
	}
	updateLocalCart(selector) {
		if (selector) {
			this.items = this.buildCartItemsFromPage(selector, this.items);
		} else {
			this.items = this.getLocalCart();
		}
		this.qty = this.updateQuantity(this.items);
		this.saveLocalCart(this.items);
		return this.items;
	}
	updateFromContext(context) {
		this.items = this.buildCartItemsFromContext(context, this.items);
		this.qty = this.updateQuantity(this.items);
		this.saveLocalCart(this.items);
		return this.items;
	}
	buildCartItemsFromPage(suppliedSelector) {
		const selector = suppliedSelector || '[data-item-row]';
		const rowElements = Array.prototype.slice.call(document.querySelectorAll(selector));
		return rowElements.filter(el => (el.getAttribute('data-id'))).map(el => {
			const cartQty = parseInt(el.getAttribute('data-quantity'), 10) || -1;
			const cartUnitPrice = parseFloat(el.getAttribute('data-unit-price')) || -1;
			const localItem = this.getProductById(el.getAttribute('data-id'));
			if (localItem) {
				return Object.assign(
					localItem,
					{
						qty: cartQty,
						unitPrice: cartUnitPrice
					}
				);
			}
			return {
				id: el.getAttribute('data-id'),
				productId: parseInt(el.getAttribute('data-product-id') || -1),
				qty: cartQty,
				unitPrice: cartUnitPrice
			};
		});
	}
	buildCartItemsFromContext(context) {
		const cartItems = context.cartItems || [];
		return cartItems.map(item => {
			const localItem = this.getProductById(item.id);
			if (localItem) {
				return Object.assign(
					localItem,
					{
						qty: item.quantity,
						unitPrice: item.price.value
					}
				);
			}
			return {
				id: item.id,
				productId: item.product_id,
				qty: item.quantity,
				unitPrice: item.price.value
			};
		});
	}
	updateQuantity(items) {
		if (items.length === 0) {
			return 0;
		}
		let total = 0;
		for (let i = 0; i < items.length; i++) {
			total += !isNaN(items[i].qty) ? items[i].qty : 1;
		}
		return total;
	}
	saveLocalCart(cart) {
		localStorage.setItem('__localcart', JSON.stringify(cart));
	}
	deleteLocalCart() {
		localStorage.removeItem('__localcart');
	}
	addProductToLocalCart(item) {
		const localItems = this.items.filter(i => (i.id === item.id));
		if (localItems.length == 0) {
			this.items.push(item)
		}
		if (localItems.length == 1) {
			localItems[0].qty += item.qty;
		}
		this.saveLocalCart(this.items);
	}
	getProductByKey(key, value) {
		if (!isNaN(id)) {
			const localItems = this.items.filter(i => (i[key] === value));
			if (localItems.length == 0) {
				return false;
			}
			if (localItems.length == 1) {
				return localItems[0];
			}
			return localItems;
		}
	}
	getProductById(id) {
		const localItems = this.items.filter(i => (i.id === id));
		if (localItems.length == 0) {
			return false;
		}
		if (localItems.length == 1) {
			return localItems[0];
		}
		return false;
	}
	getProductByProductId(id) {
		if (!isNaN(id)) {
			const localItems = this.items.filter(i => (i.productId === id));
			if (localItems.length == 0) {
				return false;
			}
			if (localItems.length == 1) {
				return localItems[0];
			}
			return localItems;
		}
	}
};
