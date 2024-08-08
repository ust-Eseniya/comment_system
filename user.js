class User {
    async fetchRandomUser() {
        try {
            const response = await fetch('https://randomuser.me/api/');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.results[0];
        } catch (error) {
            console.error('Error fetching random user:', error);
            return null;
        }
    }
}