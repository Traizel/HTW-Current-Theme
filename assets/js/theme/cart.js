import PageManager from './page-manager';
import _ from 'lodash';
import giftCertCheck from './common/gift-certificate-validator';
import utils from '@bigcommerce/stencil-utils';
import ShippingEstimator from './cart/shipping-estimator';
import { defaultModal } from './global/modal';
import swal from './global/sweet-alert';
import LocalCart from './global/local-cart';
import { updateCartThumbnails } from './custom/product-patterned-vinyl';
import {
	applyCartMessages,
	getCartMessages,
	bubbleCartItemsWithMessages
} from './custom/cart-helpers';
import {
	initSwatchDropdownOption
} from './custom/product-swatch-dropdown';


const localCart = new LocalCart();

export default class Cart extends PageManager {
	constructor(context) {
		super(context);
		this.context = context;
		window.bcContext = context;
		localCart.updateFromContext(context);
		updateCartThumbnails('.cart', localCart.items);
		if (context.cartItems) {
			this.cartMessages = getCartMessages(context.cartItems);
			this.displayCartMessages();
		}
	}
	onReady() {
		this.$cartContent = $('[data-cart-content]');
		this.$cartMessages = $('[data-cart-status]');
		this.$cartTotals = $('[data-cart-totals]');
		this.$overlay = $('[data-cart] .loadingOverlay')
			.hide(); // TODO: temporary until roper pulls in his cart components

		this.bindEvents();
		this.checkForDepositProduct();
	}
	displayCartMessages() {
		applyCartMessages(this.cartMessages);
		bubbleCartItemsWithMessages();
		// freeShippingMessage(localCart.items, 165);
	}
	checkForDepositProduct() {
		this.$overlay.show();
		if (!this.hasDepositProduct()) {
			this.$overlay.hide();
			return false;
		}
		const itemRows = Array.prototype.slice.call(document.querySelectorAll('[data-item-row]')).map(el => {
			el.disabled = true;
			return el;
		});
		
		if (itemRows.length > 1) {
			swal.fire({
				text: 'Whoops! Custom product deposits cannot be purchased with other retail products. All other items in your cart will be removed. Cancel to remove your deposit from your order.',
				icon: 'warning',
				showCancelButton: true,
				confirmButtonText: 'Yes, Burn them!',
				cancelButtonText: 'No, cancel!',
			}).then((result) => {
				if (result.value) {
					this.$overlay.show();
					localCart.items.filter(item => {
						return [864, 865, 866].indexOf(item.productId) === -1;
					}).forEach(item => {
						utils.api.cart.itemRemove(item.id, (err, response) => {
							if (response.data.status === 'succeed') {
								item.qty = 0;
							}
						});
					});
					this.refreshContent(true);
					return false;
				}
			}, (reason) => {
				if (reason === 'cancel') {
					this.$overlay.show();
					localCart.items.filter(item => {
						return [864, 865, 866].indexOf(item.productId) > -1;
					}).forEach(item => {
						utils.api.cart.itemRemove(item.id);
					});
					this.refreshContent(true);
				}
				return false;
			});
		}
		Array.prototype.slice.call(document.querySelectorAll('.cart-total-block')).forEach(el => {
			el.parentElement.removeChild(el);
		});
		this.$overlay.hide();
	}
	hasDepositProduct() {
		const filteredProducts = Array.prototype.slice.call(document.querySelectorAll('.page .cart-item-name')).filter(el => {
			const re = /deposit$/g;
			return re.test(el.textContent.trim().toLowerCase());
		});
		return filteredProducts.length > 0;
	}
	cartUpdate($target) {
		const itemId = $target.data('cartItemid');
		const $el = $(`#qty-${itemId}`);
		const oldQty = parseInt($el.val(), 10);
		const maxQty = parseInt($el.data('quantityMax'), 10);
		const minQty = parseInt($el.data('quantityMin'), 10);
		const minError = $el.data('quantityMinError');
		const maxError = $el.data('quantityMaxError');
		const newQty = $target.data('action') === 'inc' ? oldQty + 1 : oldQty - 1;
		// Does not quality for min/max quantity
		if (newQty < minQty) {
            return swal.fire({
                text: minError,
                icon: 'error',
            });
        } else if (maxQty > 0 && newQty > maxQty) {
            return swal.fire({
                text: maxError,
                icon: 'error',
            });
        }

		this.$overlay.show();

		utils.api.cart.itemUpdate(itemId, newQty, (err, response) => {
			console.log(response);
			this.$overlay.hide();
			if (response.data.status === 'succeed') {
				// if the quantity is changed "1" from "0", we have to remove the row.
				const remove = (newQty === 0);

				this.refreshContent(remove);
			} else {
				$el.val(oldQty);
				swal.fire({
					text: response.data.errors.join('\n'),
					icon: 'error',
				});
			}
		});
	}

	cartUpdateQtyTextChange($target, preVal = null) {
		const itemId = $target.data('cartItemid');
		const $el = $(`#qty-${itemId}`);
		const maxQty = parseInt($el.data('quantityMax'), 10);
		const minQty = parseInt($el.data('quantityMin'), 10);
		const oldQty = preVal !== null ? preVal : minQty;
		const minError = $el.data('quantityMinError');
		const maxError = $el.data('quantityMaxError');
		const newQty = parseInt(Number($el.val()), 10);
		let invalidEntry;

		// Does not quality for min/max quantity
		if (!newQty) {
            invalidEntry = $el.val();
            $el.val(oldQty);
            return swal.fire({
                text: `${invalidEntry} is not a valid entry`,
                icon: 'error',
            });
        } else if (newQty < minQty) {
            $el.val(oldQty);
            return swal.fire({
                text: minError,
                icon: 'error',
            });
        } else if (maxQty > 0 && newQty > maxQty) {
            $el.val(oldQty);
            return swal.fire({
                text: maxError,
                icon: 'error',
            });
        }

		this.$overlay.show();
		utils.api.cart.itemUpdate(itemId, newQty, (err, response) => {
			this.$overlay.hide();
			if (response.data.status === 'succeed') {
				// if the quantity is changed "1" from "0", we have to remove the row.
				const remove = (newQty === 0);

				this.refreshContent(remove);
			} else {
				$el.val(oldQty);
				swal.fire({
                    text: response.data.errors.join('\n'),
                    icon: 'error',
                });
			}
		});
	}
	removeCartItemRow(itemId) {
		const row = document.querySelector(`.cart [data-id="${itemId}"]`);
		if (row) {
			row.parentElement.removeChild(row);
		}
	}
	cartRemoveItem(itemId) {
		this.$overlay.show();
		utils.api.cart.itemRemove(itemId, (err, response) => {
			if (response.data.status === 'succeed') {
				this.refreshContent(true);
				return false;
			} else {
				swal.fire({
                    text: response.data.errors.join('\n'),
                    icon: 'error',
                });
			}
		});
	}

	appylColorAttributes() {
		Array.prototype.slice.call(document.querySelectorAll('.form-field')).forEach(el => {
			el.className += ` ${el.getAttribute('data-product-attribute')}`;
		});
		initSwatchDropdownOption();
	}

	cartEditOptions(itemId) {
		const modal = defaultModal();
		const options = {
			template: 'cart/modals/configure-product',
		};

		modal.open();

		utils.api.productAttributes.configureInCart(itemId, options, (err, response) => {
			modal.updateContent(response.content);
			this.appylColorAttributes();
			this.bindGiftWrappingForm();

			modal.setupFocusableElements(modalTypes.CART_CHANGE_PRODUCT);
		});

		utils.hooks.on('product-option-change', (event, currentTarget) => {
			const $changedOption = $(currentTarget);
			const $form = $changedOption.parents('form');
			const $submit = $('input.button', $form);
			const $messageBox = $('.alertMessageBox');
			const item = $('[name="item_id"]', $form).attr('value');

			utils.api.productAttributes.optionChange(item, $form.serialize(), (err, result) => {
				const data = result.data || {};

				if (err) {
					swal.fire({
                        text: err,
                        icon: 'error',
                    });
					return false;
				}

				if (data.purchasing_message) {
					$('p.alertBox-message', $messageBox).text(data.purchasing_message);
					$submit.prop('disabled', true);
					$messageBox.show();
				} else {
					$submit.prop('disabled', false);
					$messageBox.hide();
				}

				if (!data.purchasable || !data.instock) {
					$submit.prop('disabled', true);
				} else {
					$submit.prop('disabled', false);
				}
			});
		});
	}

	refreshContent(remove) {
		const $cartItemsRows = $('[data-item-row]', this.$cartContent);
		const $cartPageTitle = $('[data-cart-page-title]');
		const options = {
			template: {
				content: 'cart/content',
				totals: 'cart/totals',
				pageTitle: 'cart/page-title',
				statusMessages: 'cart/status-messages',
			},
		};

		this.$overlay.show();

		// Remove last item from cart? Reload
		if (remove && $cartItemsRows.length === 1) {
			return window.location.reload();
		}

		utils.api.cart.getContent(options, (err, response) => {
			this.$cartContent.html(response.content);
			this.$cartTotals.html(response.totals);
			this.$cartMessages.html(response.statusMessages);
			window.cartResponse = response;
			
			this.checkMinimumOrderTotal();

			$cartPageTitle.replaceWith(response.pageTitle);
			
			this.bindEvents();
			this.$overlay.hide();
			this.updateLocalCart();
			this.displayCartMessages();
			// $('body').trigger('update-cart-preview');
		});
	}

	clearCart() {
		swal.fire({
			text: 'Are you sure you want to delete your cart? This action cannot be undone.',
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'Delete my cart',
			cancelButtonText: 'Cancel',
		}).then(result => {
			if (result.isConfirmed) {
			$.ajax(`/api/storefront/carts/${this.context.cartId}`, {
				method: 'DELETE'
			}).then(response => {
				window.open(window.location, '_self');
			});
			return false;
		} else if (result.isDenied) {
			return false;
		}	
		});
	}

	checkMinimumOrderTotal() {
		const subtotalValue = document.querySelector('.cart-total.subtotal .cart-total-value');
		if (subtotalValue) {
			const subtotalFloat = parseFloat(subtotalValue.innerText.substr(1));
			const orderMinimum = 15;
			const orderMinimumDialog = document.querySelector('.order-minimum-disclaimer');
			const refreshCart = (subtotalFloat < orderMinimum && orderMinimumDialog === null) || (subtotalFloat >= orderMinimum && orderMinimumDialog !== null);
			if (refreshCart) {
				window.location = '/cart.php';
			}
		}
	}

	updateLocalCart() {
		localCart.updateLocalCart('[data-cart-content] [data-item-row]');
		$('body').trigger('cart-quantity-update', localCart.qty);
	}

	bindCartEvents() {
		const debounceTimeout = 400;
		const cartUpdate = _.bind(_.debounce(this.cartUpdate, debounceTimeout), this);
		const cartUpdateQtyTextChange = _.bind(_.debounce(this.cartUpdateQtyTextChange, debounceTimeout), this);
		const cartRemoveItem = _.bind(_.debounce(this.cartRemoveItem, debounceTimeout), this);
		const cartClear = _.bind(_.debounce(this.clearCart, debounceTimeout), this);
		
		let preVal;
		// cart update
		$('[data-cart-update]', this.$cartContent).on('click', event => {
			const $target = $(event.currentTarget);
			event.preventDefault();
			// update cart quantity
			cartUpdate($target);
		});

		// cart qty manually updates
		$('.cart-item-qty-input', this.$cartContent).on('focus', function onQtyFocus() {
			preVal = this.value;
		}).change(event => {
			const $target = $(event.currentTarget);
			event.preventDefault();
			// update cart quantity
			cartUpdateQtyTextChange($target, preVal);
		});

		$('[data-clear-cart]', this.$cartContent).on('click', event => {
			event.preventDefault();
			// remove all cart items
			cartClear();
		});

		$('.cart-remove', this.$cartContent).on('click', event => {
			const itemId = $(event.currentTarget).data('cartItemid');
			cartRemoveItem(itemId);
			event.preventDefault();
		});
		$('[data-item-edit]', this.$cartContent).on('click', event => {
			const itemId = $(event.currentTarget).data('itemEdit');

			event.preventDefault();
			// edit item in cart
			this.cartEditOptions(itemId);
		});
	}

	bindPromoCodeEvents() {
		const $couponContainer = $('.coupon-code');
		const $couponForm = $('.coupon-form');
		const $codeInput = $('[name="couponcode"]', $couponForm);

		$('.coupon-code-add').on('click', event => {
			event.preventDefault();

			$(event.currentTarget).hide();
			$couponContainer.show();
			$('.coupon-code-cancel').show();
			$codeInput.trigger('focus');
		});

		$('.coupon-code-cancel').on('click', event => {
			event.preventDefault();

			$couponContainer.hide();
			$('.coupon-code-cancel').hide();
			$('.coupon-code-add').show();
		});

		$couponForm.on('submit', event => {
			const code = $codeInput.val();

			event.preventDefault();

			// Empty code
			if (!code) {
				return swal.fire({
					text: $codeInput.data('error'),
					icon: 'error',
				});
			}

			utils.api.cart.applyCode(code, (err, response) => {
				if (response.data.status === 'success') {
					this.refreshContent();
				} else {
					swal.fire({
						text: response.data.errors.join('\n'),
						icon: 'error',
					});
				}
			});
		});
	}

	bindGiftCertificateEvents() {
		const $certContainer = $('.gift-certificate-code');
		const $certForm = $('.cart-gift-certificate-form');
		const $certInput = $('[name="certcode"]', $certForm);

		$('.gift-certificate-add').on('click', event => {
			event.preventDefault();
			$(event.currentTarget).toggle();
			$certContainer.toggle();
			$('.gift-certificate-cancel').toggle();
		});

		$('.gift-certificate-cancel').on('click', event => {
			event.preventDefault();
			$certContainer.toggle();
			$('.gift-certificate-add').toggle();
			$('.gift-certificate-cancel').toggle();
		});

		$certForm.on('submit', event => {
			const code = $certInput.val();

			event.preventDefault();

			if (!giftCertCheck(code)) {
				return swal.fire({
					text: $certInput.data('error'),
					icon: 'error',
				});
			}

			utils.api.cart.applyGiftCertificate(code, (err, resp) => {
				if (resp.data.status === 'success') {
					this.refreshContent();
				} else {
					swal.fire({
						text: resp.data.errors.join('\n'),
						icon: 'error',
					});
				}
			});
		});
	}

	bindGiftWrappingEvents() {
		const modal = defaultModal();

		$('[data-item-giftwrap]').on('click', event => {
			const itemId = $(event.currentTarget).data('itemGiftwrap');
			const options = {
				template: 'cart/modals/gift-wrapping-form',
			};

			event.preventDefault();

			modal.open();

			utils.api.cart.getItemGiftWrappingOptions(itemId, options, (err, response) => {
				modal.updateContent(response.content);

				this.bindGiftWrappingForm();
			});
		});
	}

	bindGiftWrappingForm() {
		$('.giftWrapping-select').on('change', event => {
			const $select = $(event.currentTarget);
			const id = $select.val();
			const index = $select.data('index');

			if (!id) {
				return;
			}

			const allowMessage = $select.find(`option[value=${id}]`).data('allowMessage');

			$(`.giftWrapping-image-${index}`).hide();
			$(`#giftWrapping-image-${index}-${id}`).show();

			if (allowMessage) {
				$(`#giftWrapping-message-${index}`).show();
			} else {
				$(`#giftWrapping-message-${index}`).hide();
			}
		});

		$('.giftWrapping-select').trigger('change');

		function toggleViews() {
			const value = $('input:radio[name ="giftwraptype"]:checked').val();
			const $singleForm = $('.giftWrapping-single');
			const $multiForm = $('.giftWrapping-multiple');

			if (value === 'same') {
				$singleForm.show();
				$multiForm.hide();
			} else {
				$singleForm.hide();
				$multiForm.show();
			}
		}

		$('[name="giftwraptype"]').on('click', toggleViews);

		toggleViews();
	}

	addCartToBrowserHistory() {
		const state = {
			action: 'reload'
		};
		window.history.pushState(state, '', '/cart.php');
		window.addEventListener('popstate', e => {
			console.log(e);
			window.location.href = '/cart.php';
			return false;
		});
	}

	bindCheckoutEvents() {
		this.addCartToBrowserHistory.bind(this);
		const touchDevice = 'ontouchstart' in document;
		const boltBtn = document.querySelector('.bolt-button-wrapper');
		if (touchDevice && boltBtn) {
			boltBtn.addEventListener('click', this.addCartToBrowserHistory);
		}
	}

	bindEvents() {
		this.bindCartEvents();
		this.bindPromoCodeEvents();
		this.bindGiftWrappingEvents();
		this.bindGiftCertificateEvents();
		this.bindCheckoutEvents();
		// initiate shipping estimator module
		this.shippingEstimator = new ShippingEstimator($('[data-shipping-estimator]'));
	}
}
