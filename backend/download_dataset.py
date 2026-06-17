import os
import shutil
import kagglehub

def main():
    print("Downloading dataset from Kaggle...")
    path = kagglehub.dataset_download("nikhilkushwaha2529/real-estate-with-image")
    print("Downloaded path:", path)
    
    # List actual folders to see how they are named
    contents = os.listdir(path)
    print("Dataset contents:", contents)
    
    # Target path in frontend
    target_base = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/public/images"))
    print("Target directory:", target_base)
    
    # Map from source folder names to target folder names
    # (We lowercase and handle naming variations)
    mapping = {
        'bedroom': 'bedroom',
        'bathroom': 'bathroom',
        'kitchen': 'kitchen',
        'livingroom': 'living_room',
        'living_room': 'living_room',
        'frontview': 'exterior',
        'outside': 'exterior',
        'exterior': 'exterior',
        'frontyard': 'exterior',
        'backyard': 'exterior'
    }
    
    
    # Find the actual directory containing the room folders
    src_base_dir = None
    for root, dirs, files in os.walk(path):
        if 'bedroom' in dirs and 'bathroom' in dirs and 'kitchen' in dirs:
            src_base_dir = root
            break

    if not src_base_dir:
        print("Error: Could not locate the directory containing the dataset folders.")
        return

    print("Found source base directory:", src_base_dir)

    # Find matching source folders in contents
    for folder in os.listdir(src_base_dir):
        src_folder_path = os.path.join(src_base_dir, folder)
        if not os.path.isdir(src_folder_path):
            continue
            
        normalized = folder.lower().strip()
        matched_target = None
        for key, val in mapping.items():
            if key in normalized:
                matched_target = val
                break
                
        if matched_target:
            dest_dir = os.path.join(target_base, matched_target)
            os.makedirs(dest_dir, exist_ok=True)
            print(f"Copying from {folder} to {matched_target}...")
            
            # Copy up to 25 images to be safe
            files = [f for f in os.listdir(src_folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
            files.sort()
            for filename in files[:25]:
                src_file = os.path.join(src_folder_path, filename)
                dest_file = os.path.join(dest_dir, filename)
                shutil.copy2(src_file, dest_file)
                
    print("Copy complete! Checking final directories:")
    if os.path.exists(target_base):
        print("Frontend images folders:", os.listdir(target_base))

if __name__ == "__main__":
    main()
