# Doctor Images Folder

This folder contains all doctor profile photos for the Aqiraa website.

## Image Naming Convention

Images are **automatically named** based on the doctor's name using the format:
```
firstname_lastname.jpg
```

### Examples:
- **Dr. Pratima Shinde** → `pratima_shinde.jpg`
- **Dr. Ishani Deshmukh** → `ishani_deshmukh.jpg`
- **Dr. Tanvi Malhotra** → `tanvi_malhotra.jpg`

## How to Add a New Doctor Photo

1. **Prepare the image:**
   - Recommended size: 500x500px (square)
   - Format: JPG (preferred) or PNG
   - File size: Keep under 500KB for faster loading

2. **Name the file correctly:**
   - Use the format: `firstname_lastname.jpg`
   - All lowercase
   - Remove "Dr." prefix
   - Example: For "Dr. Pratima Shinde", save as `pratima_shinde.jpg`

3. **Upload the image:**
   - Place the image file in this folder: `/public/images/doctors/`

4. **Add doctor via Admin Panel:**
   - Go to: https://child-consultant.web.app/admin/manage-doctors.html
   - Click "Add New Doctor"
   - Enter the doctor's full name (e.g., "Dr. Pratima Shinde")
   - The system will automatically generate the image path based on the name
   - Fill in all other details and save

5. **Deploy the changes:**
   ```bash
   cd /Users/prajwalwaingankar/ChildConsultant
   git add public/images/doctors/
   git commit -m "Add doctor photo: [doctor name]"
   git push
   firebase deploy --only hosting
   ```

## Default Placeholder

If a doctor's image is not found, the system will automatically display:
- `default_placeholder.jpg` - A generic doctor placeholder image

## Current Images

- `default_placeholder.jpg` - Default placeholder for missing images
- `doctor.jpg` - Generic doctor image
- `dr_dietician.png`
- `dr_educator.png`
- `dr_pediatrician.png`
- `dr_therapist.png`
- `dr_yoga.png`

## Important Notes

- **No need to enter image filename** in the admin panel - it's automatic!
- The system extracts first and last name from the doctor's full name
- Middle names are ignored (only first and last name are used)
- If the image file doesn't exist, a placeholder will be shown
