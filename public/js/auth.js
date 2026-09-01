const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");


// LOGIN
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("loginMessage");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                message.textContent = data.message;
                return;
            }

            // Save JWT for authenticated requests
            localStorage.setItem("token", data.token);

            window.location.href = "dashboard.html";

        } catch (error) {
            console.error(error);
            message.textContent = "Unable to connect to server.";
        }
    });
}


// REGISTER
if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("registerMessage");

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                message.textContent = data.message;
                return;
            }

            // Registration successful → go to login
            window.location.href = "login.html";

        } catch (error) {
            console.error(error);
            message.textContent = "Unable to connect to server.";
        }
    });
}