/**
 * BookForge - Space Provider Accreditation & Host Application Manager
 * Handles dedicated host verification lifecycle: Apply -> Pending Audit -> Approval.
 */

let currentProfile = null;

function checkBecomeProviderAuth() {
  const token = localStorage.getItem('bookforge_token');
  const user = getCurrentUser();
  if (!token || !user) {
    window.location.replace('login.html');
    return false;
  }
  return true;
}

window.addEventListener('pageshow', () => {
  checkBecomeProviderAuth();
});

async function initBecomeProviderPage() {
  if (!checkBecomeProviderAuth()) return;

  // Pre-fill header user name
  const userNameEl = document.getElementById('provider-user-name');
  if (userNameEl && user) {
    userNameEl.textContent = user.username.toUpperCase();
  }

  await loadProviderVerificationState();
}

async function loadProviderVerificationState(showFeedback = false) {
  try {
    const res = await AuthAPI.getProfile();
    currentProfile = (res && res.data !== undefined) ? res.data : res;

    if (!currentProfile) {
      showFormView();
      return;
    }

    const user = getCurrentUser();
    const isAlreadyProvider = (user && user.roles && user.roles.includes('ROLE_PROVIDER')) || 
                              (user && user.role === 'ROLE_PROVIDER') ||
                              currentProfile.providerStatus === 'APPROVED';

    const status = currentProfile.providerStatus || (isAlreadyProvider ? 'APPROVED' : 'NONE');

    if (showFeedback) {
      showToast(`Verification status: ${status}`, status === 'APPROVED' ? 'success' : 'info');
    }

    if (isAlreadyProvider || status === 'APPROVED') {
      showApprovedView();
    } else if (status === 'PENDING') {
      showPendingView(currentProfile);
    } else if (status === 'REJECTED') {
      showRejectedView(currentProfile);
    } else {
      showFormView(currentProfile);
    }
  } catch (err) {
    console.error('Failed to load profile for provider state:', err);
    showToast('Could not load current host profile: ' + (err.message || 'Server unreachable'), 'error');
    showFormView();
  }
}

function hideAllViews() {
  const views = ['view-form', 'view-pending', 'view-rejected', 'view-approved'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('d-none');
  });
}

function showFormView(profile = null) {
  hideAllViews();
  const formView = document.getElementById('view-form');
  if (formView) formView.classList.remove('d-none');

  // Pre-fill existing user info if available
  const p = profile || currentProfile;
  if (p) {
    if (p.businessName) document.getElementById('app-business-name').value = p.businessName;
    if (p.taxOrGstNumber) document.getElementById('app-tax-gst').value = p.taxOrGstNumber;
    if (p.mobileNo) document.getElementById('app-mobile').value = p.mobileNo;

    if (p.address) {
      if (p.address.address) document.getElementById('app-address').value = p.address.address;
      if (p.address.city) document.getElementById('app-city').value = p.address.city;
      if (p.address.state) document.getElementById('app-state').value = p.address.state;
      if (p.address.postcode) document.getElementById('app-postcode').value = p.address.postcode;
    }
  }
}

function showPendingView(p) {
  hideAllViews();
  const view = document.getElementById('view-pending');
  if (view) view.classList.remove('d-none');

  const bizName = (p && p.businessName) || 'Registered Studio';
  const taxId = (p && p.taxOrGstNumber) || 'Pending Tax ID';
  const phone = (p && p.mobileNo) || '—';
  
  let addrStr = '—';
  if (p && p.address) {
    addrStr = [p.address.address, p.address.city, p.address.state, p.address.postcode].filter(Boolean).join(', ');
  }

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTxt('disp-pending-biz-name', bizName);
  setTxt('disp-pending-tax-id', taxId);
  setTxt('disp-pending-phone', phone);
  setTxt('disp-pending-address', addrStr);
}

function showRejectedView(p) {
  hideAllViews();
  const view = document.getElementById('view-rejected');
  if (view) view.classList.remove('d-none');

  const bizName = (p && p.businessName) || 'Registered Entity';
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTxt('disp-rejected-biz-name', bizName);
}

function showApprovedView() {
  hideAllViews();
  const view = document.getElementById('view-approved');
  if (view) view.classList.remove('d-none');
}

// Form Submission Event
document.addEventListener('DOMContentLoaded', () => {
  initBecomeProviderPage();

  const form = document.getElementById('host-application-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const businessName = document.getElementById('app-business-name').value.trim();
      const taxOrGstNumber = document.getElementById('app-tax-gst').value.trim();
      const mobileNo = document.getElementById('app-mobile').value.trim();
      const street = document.getElementById('app-address').value.trim();
      const city = document.getElementById('app-city').value.trim();
      const state = document.getElementById('app-state').value.trim();
      const postcode = parseInt(document.getElementById('app-postcode').value, 10) || 0;

      if (!businessName || !taxOrGstNumber || !mobileNo) {
        showToast('Please fill all required business verification fields', 'error');
        return;
      }

      const payload = {
        businessName,
        taxOrGstNumber,
        mobileNo,
        businessAddress: {
          address: street,
          city,
          state,
          postcode
        }
      };

      try {
        await AuthAPI.applyProvider(payload);
        showToast('🎉 Application successfully submitted for administrator review!', 'success');
        await loadProviderVerificationState();
      } catch (err) {
        showToast(err.message || 'Failed to submit application', 'error');
      }
    });
  }
});
