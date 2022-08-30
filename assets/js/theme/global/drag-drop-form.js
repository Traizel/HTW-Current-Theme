import $ from 'jquery';

export default class DragAndDropForm {
	constructor() {
		this.form = document.getElementById('drag-drop-form');
		if (this.form) {
			this.isAdvancedUpload = this.testAdvancedUpload();
			this.droppedFiles = [];
			this.setupFormClasses(this.isAdvancedUpload);
			this.handleMultipleCheckboxEvents();
			this.handleButtonEvents();
			this.handleFiles(this.isAdvancedUpload);
		}
	}
	testAdvancedUpload() {
		const div = document.createElement('div');
		return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
	}
	setupFormClasses(isAdvancedUpload) {
		const fileInput = document.getElementById('artwork-files');
		const dragDropInput = document.querySelector('.drag-drop-input');
		if (isAdvancedUpload) {
			this.droppedFiles = [];
			this.form.classList.add('has-advanced-upload'); 
			['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(event => {
				this.form.addEventListener(event, e => {
					e.preventDefault();
					e.stopPropagation();
				});
			});
			['dragover', 'dragenter'].forEach(event => {
				this.form.addEventListener(event, () => {
					dragDropInput.classList.add('is-dragover');
				});
			});
			['dragleave', 'dragend', 'drop'].forEach(event => {
				this.form.addEventListener(event, () => {
					dragDropInput.classList.remove('is-dragover');
				});
			});
		}
		fileInput.addEventListener('focus', (e) => {
			e.target.classList.add('has-focus');
		});
		fileInput.addEventListener('blur', (e) => {
			e.target.classList.remove('has-focus');
		});
	}
	handleMultipleCheckboxEvents() {
		if (document.querySelector('[multiple-checkboxes]') !== null) {
			const container = document.querySelector('[multiple-checkboxes] .row') || document.querySelector('[multiple-checkboxes]');
			const bin = document.querySelector('.multiple-options-bin');
			Array.prototype.slice.call(container.querySelectorAll('[type="checkbox"]')).forEach(checkbox => {
				checkbox.addEventListener('change', e => {
					if (e.target.checked) {
						this.pushOptionToBin(e.target, bin);
					} else {
						this.popOptionFromBin(e.target, bin);
					}
				});
			}, this);
		}
	}
	pushOptionToBin(el, bin) {
		const tag = this.buildOptionTag(el);
		bin.appendChild(tag);
	}
	popOptionFromBin(el, bin) {
		if (bin === undefined) {
			el.parentElement.removeChild(el);
			return false;
		}
		const tags = Array.prototype.slice.call(bin.querySelectorAll(`[for="${el.id}"]`));
		tags.forEach(tag => {
			bin.removeChild(tag);
		});
	}
	buildOptionTag(el) {
		const tag = document.createElement('label');
		tag.className = 'tag option-tag';
		tag.htmlFor = el.id;
		const tagImg = document.querySelector(`[for="${el.id}"] img`).cloneNode();
		const tagText = document.querySelector(`[for="${el.id}"] strong`).cloneNode(true);
		const tagClose = document.createElement('span');
		tagClose.className = 'tag-close clr-blue';
		tagClose.textContent = 'x';
		tag.appendChild(tagImg);
		tag.appendChild(tagText);
		tag.appendChild(tagClose);
		return tag;
	}
	handleButtonEvents() {
		Array.prototype.slice.call(document.querySelectorAll('.icon.checkmark')).forEach(icon => {
			icon.addEventListener('click', e => {
				const targetFormStep = e.currentTarget.parentElement.getAttribute('data-step');
				this.gotoFormStep(targetFormStep);
			}, this);
		}, this);
		this.form.querySelector('.form-actions').addEventListener('click', e => {
			e.preventDefault();
			e.stopPropagation();
			const target = e.target;
			if (target.nodeName !== 'BUTTON') {
				return false;
			}
			this.clearValidationErrors();
			const direction = target.getAttribute('data-step');
			const currentStep = parseInt(this.form.getAttribute('data-current-step')) || 1;
			if (direction === 'submit') {
				const valid = this.validateFormStep(currentStep, true);
				if (valid) {
					this.handleSubmit();
				}
				return false;
			} else if (direction === 'back') {
				if (currentStep < 2) {
					return false;
				}
				this.decrementFormStep(currentStep);
			} else if (direction === 'next') {
				this.validateFormStep(currentStep);
			}
		});
	}
	checkYScroll() {
		const modal = document.querySelector('.custom-form-modal');
		if (modal !== null) {
			const modalPadding = 40 * 2;
			const modalContentHeight = document.getElementById('drag-drop-form').getBoundingClientRect().height + modalPadding;
			if (modalContentHeight > window.innerHeight) {
				modal.style.overflowY = 'scroll';
			} else {
				modal.style.overflowY = '';
			}
			modal.scrollTop = 0;
		}
	}
	incrementFormStep(stepNumber) {
		this.showNextButton(stepNumber + 1);
		this.form.setAttribute('data-current-step', stepNumber + 1);
	}
	decrementFormStep(stepNumber) {
		this.showNextButton(stepNumber - 1);
		this.form.setAttribute('data-current-step', stepNumber - 1);
	}
	gotoFormStep(stepNumber) {
		this.showNextButton(stepNumber);
		this.form.setAttribute('data-current-step', stepNumber);
	}
	validateFormStep(stepNumber, submit = false) {
		let step = 0;
		switch(stepNumber) {
		case 1:
			step = 'one';
			break;
		case 2:
			step = 'two';
			break;
		case 3:
			step = 'three';
			break;
		}
		const errors = Array.prototype.slice.call(document.querySelectorAll(`.form-section.${step} [required]`)).filter(input => {
			return !input.validity.valid;
		});
		if (errors.length === 0) {
			if (!submit) {
				this.incrementFormStep(stepNumber);
			}
			this.checkYScroll();
			return true;
		}
		this.displayValidationErrors(errors);
		return false;
	}

	displayValidationErrors(errors) {
		if (errors.length > 0) {
			this.form.classList.add('is-error');
			errors.forEach(err => {
				const label = document.querySelector(`[for="${err.id}"]`)
				const fieldName = label ? label.textContent : err.name.replace('-', ' ');
				err.classList.add('is-error');
				const li = document.createElement('li');
				li.textContent = err.type === 'email' ? `${fieldName} is required and must be a valid email` : `${fieldName} is required`;
				document.getElementById('error-msg').appendChild(li);
			});
		}
	}
	clearValidationErrors() {
		document.getElementById('error-msg').innerHTML = '';
		Array.prototype.slice.call(document.querySelectorAll('.is-error')).forEach(el => {
			el.classList.remove('is-error');
		});
	}
	showFiles(files) {
		const fileInput = document.getElementById('artwork-files');
		const fileplaceholder = document.querySelector('[for="artwork-files"] .file-placeholder');
		if (!files || files.length === 0) {
			fileplaceholder.innerHTML = '<span class="drag-drop-text">Drag and drop files</span><span class="clr-blue">Choose a file</span>';
			return false;
		} else {
			fileplaceholder.textContent = files.length > 1 ? (fileInput.getAttribute('data-multiple-caption') || '').replace('{count}', files.length) : files[0].name;
		}
	}
	testFileTypeValidity(files) {
		const fileInput = document.getElementById('artwork-files');
		let validFileType = true;
		if (fileInput) {
			const re = new RegExp(`[(${fileInput.accept.split(',').join(')(')})]+$`);
			files.forEach(f => {
				if (!re.test(f.name)) {
					validFileType = false;
				}
			});
			if (!validFileType) {
				const fileTypes = fileInput.accept.replace('image/*', 'any image');
				alert(`You have chosen an invalid file type. Files must be one of the following: ${fileTypes}`);
			}
		}
		return validFileType;
	}
	handleFileDropEvent(e, fileInput) {
		// e.preventDefault();
		e.stopPropagation();
		const validFileTypes = this.testFileTypeValidity(e.dataTransfer.files);
		if (!validFileTypes) {
			return;
		}
		fileInput.classList.add('has-files');
		this.droppedFiles = e.dataTransfer.files;
		this.showFiles(this.droppedFiles);
		this.showNextButton(2);
	}
	handleFileChangeEvent(e, fileInput) {
		const files = e.target.files;
		if (files.length > 0) {
			const validFileTypes = this.testFileTypeValidity(files);
			if (!validFileTypes) {
				return;
			}
			fileInput.classList.add('has-files');
			this.droppedFiles = files;
			this.showFiles(this.droppedFiles);
		} else {
			fileInput.classList.remove('has-files');
			this.droppedFiles = [];
			this.showFiles(this.droppedFiles);
		}
		this.showNextButton(2);
	}
	handleFileClearEvent(e, fileInput) {
		e.preventDefault();
		e.stopPropagation();
		e.target.value = null;
		this.droppedFiles = [];
		this.showFiles(this.droppedFiles);
		fileInput.classList.remove('has-files');
		this.showNextButton(2);
	}
	handleFiles(isAdvancedUpload) {
		const fileInput = document.getElementById('artwork-files');
		if (isAdvancedUpload) {
			this.form.addEventListener('drop', e => {
				this.handleFileDropEvent(e, fileInput);
			}, this);
		}
		fileInput.addEventListener('change', e => {
			this.handleFileChangeEvent(e, fileInput);
		}, this);
		const fileClear = document.querySelector('.file-clear');
		fileClear.addEventListener('click', e => {
			this.handleFileClearEvent(e, fileInput);
		}, this);
	}
	showNextButton(currentStep) {
		if (currentStep == 2 && this.droppedFiles.length === 0) {
			document.querySelector('.button.button--primary.next').classList.add('is-srOnly');
			return false;
		}
		document.querySelector('.button.button--primary.next').classList.remove('is-srOnly');
	}
	clearFormInputs() {
		Array.prototype.slice.call(this.form.querySelectorAll('input')).forEach(input => {
			if (input.type === 'text' || input.type === 'tel' || input.type === 'email') {
				input.value = '';
				return false;
			}
			if (input.type === 'file') {
				const placeholder = document.querySelector(`[for="${input.id}"] .file-placeholder`);
				if (placeholder) {
					placeholder.innerHTML = '<span class="drag-drop-text">Drag and drop files</span><span class="clr-blue">Choose a file</span>';
				}
				input.classList.remove('has-files');
				input.value = null;
				return false;
			}
			if (input.checked) {
				input.checked = false;
				return false;
			}
		});
		this.form.reset();
	}
	handleSubmit() {
		const _this = this;
		const fileInput = document.getElementById('artwork-files');
		const ajaxData = new FormData(this.form);
		if (this.droppedFiles.length > 0) {
			this.droppedFiles.forEach(file => {
				ajaxData.append(fileInput.getAttribute('name'), file);
			});
		}
		this.form.classList.add('is-uploading');
		$.ajax({
			url: _this.form.getAttribute('action'),
			type: _this.form.getAttribute('method'),
			data: ajaxData,
			cache: false,
			contentType: false,
			processData: false
		})
			.done((data, status) => {
				console.log(data);
				console.log(status);
				_this.form.classList.remove('is-uploading');
				_this.form.classList.add(status === 'success' ? 'is-success' : 'is-error');
				_this.clearFormInputs();
				// if (status === 'success') {
				// 	window.location = '/thank-you-custom-transfer/'
				// }
			})
			.fail((data, status) => {
				console.log(data);
				_this.form.classList.remove('is-uploading');
				_this.form.classList.add('is-error');
				if (data.error) {
					document.getElementById('error-msg').textContent = data.error;
					return;
				}
				if (data.status >= 400) {
					document.getElementById('error-msg').textContent = data.statusText;
					return;
				}
				if (data.status === 0) {
					document.getElementById('error-msg').textContent = data.statusText === 'error' ? 'Something went wrong. Try again later or contact our support team for assistance.' : data.statusText;
					return;
				}
			});
	}
}
