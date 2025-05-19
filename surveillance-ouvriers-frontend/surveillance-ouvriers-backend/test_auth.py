import requests
import json

# URL de l'API
API_URL = 'http://localhost:5000'

def test_login(username, password):
    print(f"\nTest de connexion pour l'utilisateur: {username}")
    try:
        # Envoyer la requête de connexion
        response = requests.post(
            f"{API_URL}/api/login",
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"}
        )
        
        # Afficher le code de statut
        print(f"Statut: {response.status_code}")
        
        # Afficher les données de réponse
        try:
            data = response.json()
            print("Données de réponse:")
            print(json.dumps(data, indent=2))
            
            if "user" in data:
                print(f"\nInformations utilisateur:")
                print(f"- Nom d'utilisateur: {data['user'].get('username')}")
                print(f"- Rôle: {data['user'].get('role')}")
                print(f"- Nom: {data['user'].get('name')}")
                
            return data
        except ValueError:
            print("La réponse n'est pas au format JSON")
            print(response.text)
            return None
    except Exception as e:
        print(f"Erreur lors de la connexion: {str(e)}")
        return None

if __name__ == '__main__':
    # Tester la connexion admin
    print("=== TEST DE CONNEXION ADMIN ===")
    admin_data = test_login('admin', 'admin123')
    
    # Tester la connexion worker
    print("\n=== TEST DE CONNEXION WORKER ===")
    worker_data = test_login('worker', 'worker123')
    
    # Afficher un résumé
    print("\n=== RÉSUMÉ DES TESTS ===")
    if admin_data and worker_data:
        print(f"Admin role: {admin_data['user'].get('role')}")
        print(f"Worker role: {worker_data['user'].get('role')}")
        
        if admin_data['user'].get('role') == 'admin' and worker_data['user'].get('role') == 'worker':
            print("\n✅ Les rôles sont correctement configurés dans l'API")
        else:
            print("\n❌ Les rôles ne sont PAS correctement configurés dans l'API")
