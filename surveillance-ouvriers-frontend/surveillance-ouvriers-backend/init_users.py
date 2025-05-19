from app import app, db, User
import bcrypt

def initialize_users():
    """Initialise les utilisateurs admin et worker dans la base de donnu00e9es"""
    with app.app_context():
        print("Vu00e9rification et initialisation des utilisateurs...")
        
        # Vu00e9rifier si les utilisateurs existent du00e9ju00e0
        admin_user = User.query.filter_by(username='admin').first()
        worker_user = User.query.filter_by(username='worker').first()
        
        # Cru00e9er l'utilisateur admin s'il n'existe pas
        if not admin_user:
            print("Cru00e9ation du compte administrateur...")
            admin_user = User(
                username='admin',
                name='Administrator',
                role='admin'
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            print("Compte admin cru00e9u00e9 avec succu00e8s. Identifiants: admin/admin123")
        else:
            print("Le compte admin existe du00e9ju00e0.")
        
        # Cru00e9er l'utilisateur worker s'il n'existe pas
        if not worker_user:
            print("Cru00e9ation du compte worker...")
            worker_user = User(
                username='worker',
                name='Worker User',
                role='worker'
            )
            worker_user.set_password('worker123')
            db.session.add(worker_user)
            print("Compte worker cru00e9u00e9 avec succu00e8s. Identifiants: worker/worker123")
        else:
            print("Le compte worker existe du00e9ju00e0.")
            
        # Mettre u00e0 jour les mots de passe existants si nu00e9cessaire
        update_password = False
        if admin_user and update_password:
            admin_user.set_password('admin123')
            print("Mot de passe du compte admin mis u00e0 jour.")
        
        if worker_user and update_password:
            worker_user.set_password('worker123')
            print("Mot de passe du compte worker mis u00e0 jour.")
        
        # Enregistrer les modifications
        db.session.commit()
        print("Initialisation des utilisateurs terminu00e9e.")

if __name__ == '__main__':
    initialize_users()
