// tests/userController.test.js

const userController = require('./controller/userController');
const User = require('./model/user');

// Mock de l'objet res
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('getAllUsers', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Réinitialise les mocks avant chaque test
    });

    // Test 1 : Succès - Récupération de tous les utilisateurs
    it('should return all users with status 200', async () => {
        // Mock des données
        const mockUsers = [
            { _id: '1', name: 'User 1', email: 'user1@example.com' },
            { _id: '2', name: 'User 2', email: 'user2@example.com' },
        ];

        // Mock de User.find() pour retourner les utilisateurs
        User.find = jest.fn().mockResolvedValue(mockUsers);

        // Mock de req et res
        const req = {};
        const res = mockResponse();

        // Appel de la méthode
        await userController.getAllUsers(req, res);

        // Vérifications
        expect(User.find).toHaveBeenCalled(); // Vérifie que User.find a été appelé
        expect(res.status).toHaveBeenCalledWith(200); // Vérifie le statut 200
        expect(res.json).toHaveBeenCalledWith(mockUsers); // Vérifie que les utilisateurs sont retournés
    });

    // Test 2 : Échec - Erreur lors de la récupération des utilisateurs
    it('should return 500 if there is an error', async () => {
        // Mock d'une erreur
        const errorMessage = 'Database error';
        User.find = jest.fn().mockRejectedValue(new Error(errorMessage));

        // Mock de req et res
        const req = {};
        const res = mockResponse();

        // Appel de la méthode
        await userController.getAllUsers(req, res);

        // Vérifications
        expect(User.find).toHaveBeenCalled(); // Vérifie que User.find a été appelé
        expect(res.status).toHaveBeenCalledWith(500); // Vérifie le statut 500
        expect(res.json).toHaveBeenCalledWith({ message: errorMessage }); // Vérifie le message d'erreur
    });
});