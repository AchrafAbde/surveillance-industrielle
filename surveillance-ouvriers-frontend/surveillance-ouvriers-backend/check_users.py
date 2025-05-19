from app import app, db, User

def check_users():
    with app.app_context():
        print("\n=== Liste des utilisateurs dans la base de donnu00e9es ===")
        users = User.query.all()
        
        for user in users:
            print(f"ID: {user.id} | Nom d'utilisateur: {user.username} | Nom: {user.name} | Ru00f4le: {user.role}")
        
        print(f"\nNombre total d'utilisateurs: {len(users)}")
        print("==================================================\n")

if __name__ == '__main__':
    check_users()
