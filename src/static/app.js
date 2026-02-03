document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: get initials from email (before @)
  function getInitials(email) {
    const name = email.split("@")[0];
    const parts = name.split(/[\.\-_ ]+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + (parts[1][0] || "")).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message + reset select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participants = details.participants || [];
        const visibleCount = 5;
        const visible = participants.slice(0, visibleCount);

        let avatarsHtml = `<div class="participants-summary"><div class="avatars">`;
        if (participants.length === 0) {
          avatarsHtml += `<span class="no-participants">No participants yet</span>`;
        } else {
          visible.forEach(p => {
            avatarsHtml += `<span class="avatar" title="${p}">${getInitials(p)}</span>`;
          });
          if (participants.length > visibleCount) {
            avatarsHtml += `<span class="more" title="${participants.length - visibleCount} more">+${participants.length - visibleCount}</span>`;
          }
        }
        avatarsHtml += `</div><div class="participants-meta">${participants.length} ${participants.length === 1 ? 'participant' : 'participants'}</div></div>`;

        avatarsHtml += `<button class="toggle-participants" aria-expanded="false">View</button>`;
        avatarsHtml += `<div class="participant-list hidden">${participants.map(p => `<div class="participant-item">${p} <button class="remove-btn" data-email="${p}" aria-label="Remove ${p}">X</button></div>`).join('')}</div>`;

        participantsSection.innerHTML = avatarsHtml;
        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Toggle show/hide full participant list
        const toggleBtn = participantsSection.querySelector('.toggle-participants');
        const listDiv = participantsSection.querySelector('.participant-list');
        toggleBtn.addEventListener('click', () => {
          const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
          toggleBtn.setAttribute('aria-expanded', String(!expanded));
          toggleBtn.textContent = expanded ? 'View' : 'Hide';
          listDiv.classList.toggle('hidden');
        });

        // Add remove button handlers for each participant
        participantsSection.querySelectorAll('.remove-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const emailToRemove = btn.dataset.email;
            if (!confirm(`Remove ${emailToRemove} from ${name}?`)) return;
            try {
              btn.disabled = true;
              const res = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(emailToRemove)}`, { method: 'DELETE' });
              const data = await res.json();
              if (res.ok) {
                messageDiv.textContent = data.message;
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                fetchActivities();
              } else {
                messageDiv.textContent = data.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant. Please try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } finally {
              btn.disabled = false;
            }
          });
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // REFRESH activities to show the newly added participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
