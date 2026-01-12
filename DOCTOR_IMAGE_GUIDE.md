# Doctor Image Management Guide

## Overview

The admin panel now uses **automatic image naming** based on the doctor's name. No need to manually enter image filenames!

## How It Works

### 1. Automatic Image Naming

When you add a doctor with the name **"Dr. Pratima Shinde"**, the system automatically:
- Removes the "Dr." prefix
- Takes the first name: `pratima`
- Takes the last name: `shinde`
- Creates the filename: `pratima_shinde.jpg`
- Constructs the path: `images/doctors/pratima_shinde.jpg`

### 2. Examples

| Doctor Name | Generated Filename |
|------------|-------------------|
| Dr. Pratima Shinde | `pratima_shinde.jpg` |
| Dr. Ishani Deshmukh | `ishani_deshmukh.jpg` |
| Dr. Tanvi Malhotra | `tanvi_malhotra.jpg` |
| Dr. Amit Kumar Sharma | `amit_sharma.jpg` (middle name ignored) |

## Workflow for Adding a New Doctor

### Step 1: Prepare the Doctor's Photo

1. Get a high-quality professional photo
2. Resize to **500x500px** (square)
3. Save as **JPG** format
4. Keep file size under **500KB**

### Step 2: Name the Photo File

Use the format: `firstname_lastname.jpg`

**Example:**
- Doctor: "Dr. Pratima Shinde"
- Filename: `pratima_shinde.jpg`

**Rules:**
- All lowercase
- No spaces, use underscore `_`
- Remove "Dr." prefix
- Use only first and last name

### Step 3: Upload to Code Repository

```bash
# Place the file in the doctors folder
/Users/prajwalwaingankar/ChildConsultant/public/images/doctors/pratima_shinde.jpg
```

### Step 4: Add Doctor via Admin Panel

1. Go to: https://child-consultant.web.app/admin/manage-doctors.html
2. Log in with your admin account
3. Click **"Add New Doctor"**
4. Enter the doctor's full name: `Dr. Pratima Shinde`
5. Fill in all other details (title, experience, qualification, etc.)
6. Click **"Save Doctor"**

**Important:** The system will automatically look for `images/doctors/pratima_shinde.jpg`

### Step 5: Deploy the Code

```bash
cd /Users/prajwalwaingankar/ChildConsultant

# Add the new image to git
git add public/images/doctors/pratima_shinde.jpg

# Commit with a descriptive message
git commit -m "Add doctor photo: Dr. Pratima Shinde"

# Push to repository
git push

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## What Happens If Image Is Missing?

If you add a doctor but haven't uploaded their image yet, the system will:
- Automatically display a **default placeholder image**
- Show: `images/doctors/default_placeholder.jpg`
- The doctor will still be visible on the website
- You can add the correct image later

## Admin Panel Changes

### What Was Removed:
- ❌ Image filename input field
- ❌ Image preview in the form
- ❌ Manual image path entry

### What Stays:
- ✅ All other doctor fields (name, title, experience, etc.)
- ✅ Automatic image path generation
- ✅ Fallback to placeholder if image not found

## Testing the System

### Example Test Case:

1. **Add a test doctor:**
   - Name: `Dr. Test Doctor`
   - Expected image: `images/doctors/test_doctor.jpg`

2. **Without uploading image:**
   - Doctor will show with placeholder image
   - No errors

3. **After uploading `test_doctor.jpg`:**
   - Deploy the code
   - Refresh the website
   - Doctor's actual photo will appear

## Current Image Files

Located in: `/public/images/doctors/`

```
default_placeholder.jpg   - Default placeholder (29KB)
doctor.jpg               - Generic doctor image
dr_dietician.png
dr_educator.png
dr_pediatrician.png
dr_therapist.png
dr_yoga.png
```

## Troubleshooting

### Problem: Doctor shows placeholder instead of actual photo

**Solution:**
1. Check if the file exists: `/public/images/doctors/[firstname]_[lastname].jpg`
2. Verify the filename is all lowercase
3. Ensure you deployed after adding the image
4. Clear browser cache and refresh

### Problem: Doctor name has special characters

**Example:** "Dr. José García"

**Solution:**
- Remove special characters from filename
- Use: `jose_garcia.jpg`
- The system handles this automatically in the database

### Problem: Doctor has multiple last names

**Example:** "Dr. Maria Lopez Garcia"

**Solution:**
- System uses last word as last name
- Filename: `maria_garcia.jpg`

## Benefits of This Approach

✅ **Consistent naming** - All images follow the same pattern
✅ **No manual entry** - Image path is automatic
✅ **Simple workflow** - Just name the file correctly and upload
✅ **Fallback support** - Placeholder shows if image is missing
✅ **Easy to manage** - All images in one folder
✅ **Version controlled** - Images are part of your codebase

## Next Steps (Optional Future Enhancement)

If you want to add image upload functionality later:
- Consider using Cloudinary (free tier: 25GB)
- Or enable Firebase Storage when needed
- Current system is perfect for MVP phase
