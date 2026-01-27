const form = document.getElementById('registration-form');
const submitButton = document.getElementById('submit-button');
const statusEl = document.getElementById('form-status');

const parentNameInput = document.getElementById('parentName');
const parentEmailInput = document.getElementById('parentEmail');
const parentPhoneInput = document.getElementById('parentPhone');
const studentNameInput = document.getElementById('studentName');
const studentDobInput = document.getElementById('studentDob');
const confirmInput = document.getElementById('confirm');

const relationshipInput = document.getElementById('relationship');
const studentEmailInput = document.getElementById('studentEmail');
const specificNeedsInput = document.getElementById('specificNeeds');

const subjectInputs = Array.from(document.querySelectorAll('input[name="subjects"]'));
const subjectError = document.getElementById('subjects-error');

if (form && submitButton && parentNameInput && parentEmailInput && parentPhoneInput && studentNameInput && studentDobInput && confirmInput) {
  const requiredInputs = [
    parentNameInput,
    parentEmailInput,
    parentPhoneInput,
    studentNameInput,
    studentDobInput,
  ];

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.dataset.state = isError ? 'error' : 'success';
  }

  function restoreButton(text) {
    submitButton.disabled = false;
    submitButton.textContent = text;
  }

  function hasValue(input) {
    return input && input.value.trim() !== '';
  }

  function collectSubjects() {
    return subjectInputs.filter((input) => input.checked).map((input) => input.value);
  }

  function getDiscoverySource() {
    const selected = form.querySelector('input[name="discoverySource"]:checked');
    return selected ? selected.value : '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', false);
    if (subjectError) {
      subjectError.hidden = true;
    }

    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    // Validate required text inputs.
    const missingField = requiredInputs.find((input) => !hasValue(input));
    if (missingField) {
      setStatus('Please complete all required fields.', true);
      missingField.focus();
      restoreButton(originalText);
      return;
    }

    // Validate subject and confirmation selections.
    const subjects = collectSubjects();
    if (subjects.length === 0) {
      setStatus('Please select at least one subject/class.', true);
      if (subjectError) {
        subjectError.hidden = false;
      }
      if (subjectInputs[0]) {
        subjectInputs[0].focus();
      }
      restoreButton(originalText);
      return;
    }

    if (!confirmInput.checked) {
      setStatus('Please confirm the information is correct.', true);
      confirmInput.focus();
      restoreButton(originalText);
      return;
    }

    const relationshipValue = relationshipInput ? relationshipInput.value.trim() : '';
    const specificNeedsValue = specificNeedsInput ? specificNeedsInput.value.trim() : '';

    const payload = {
      parentName: parentNameInput.value.trim(),
      relationshipToStudent: relationshipValue,
      relationship: relationshipValue,
      parentEmail: parentEmailInput.value.trim(),
      parentPhone: parentPhoneInput.value.trim(),
      studentName: studentNameInput.value.trim(),
      studentEmail: studentEmailInput ? studentEmailInput.value.trim() : '',
      studentDob: studentDobInput.value,
      subjects,
      specificNeedsText: specificNeedsValue,
      specificNeeds: specificNeedsValue,
      discoverySource: getDiscoverySource(),
    };

    try {
      const response = await fetch('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(responseData.error || 'Registration failed. Please try again.', true);
        restoreButton(originalText);
        return;
      }

      setStatus('Registration submitted successfully', false);
      form.reset();
      if (subjectError) {
        subjectError.hidden = true;
      }
    } catch (error) {
      setStatus('Unable to submit registration. Please try again.', true);
    } finally {
      restoreButton(originalText);
    }
  });
}
