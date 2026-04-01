#!/bin/bash

# Script to generate a project structure report with file descriptions

# Output file for the report
REPORT_FILE="project_structure_report.txt"

# Temporary file for the list of files and directories
LIST_FILE="file_list.txt"

# Generate the list of files and directories (excluding node_modules, .git, etc.)
# We already have this from the previous find command, but we'll regenerate to be sure
find . -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.idea/*" -not -path "./.trae/*" -not -path "./.kombai/*" -not -path "./.pm2/*" -not -path "./.github/*" > "$LIST_FILE"

# Function to get a short description of a file
get_description() {
    local file="$1"
    local description=""

    # Skip if it's a directory
    if [[ -d "$file" ]]; then
        echo ""
        return
    fi

    # Get the file extension
    local ext="${file##*.}"
    local filename=$(basename "$file")

    # Try to get a description based on file type
    case "$ext" in
        js|jsx|ts|tsx)
            # Look for a single-line comment at the top
            description=$(head -20 "$file" | grep -E '^\s*\/\/' | head -1 | sed 's/^\s*\/\/\s*//' | sed 's/\s*$//')
            if [[ -z "$description" ]]; then
                # Look for a JSDoc comment
                description=$(head -20 "$file" | grep -E '^\s*\/\*\*' | head -1 | sed 's/^\s*\/\*\*\s*//' | sed 's/\*\/.*$//' | sed 's/\s*$//')
            fi
            ;;
        html)
            # Look for title tag
            description=$(head -20 "$file" | grep -i '<title>' | sed 's/<\/\?title[^>]*>//gI' | head -1 | sed 's/^\s*//;s/\s*$//')
            if [[ -z "$description" ]]; then
                # Look for a comment
                description=$(head -20 "$file" | grep -E '^\s*<!--' | head -1 | sed 's/^\s*<!--//' | sed 's/-->\s*$//' | sed 's/^\s*//;s/\s*$//')
            fi
            ;;
        css)
            # Look for a comment at the top
            description=$(head -20 "$file" | grep -E '^\s*\/\*' | head -1 | sed 's/^\s*\/\*\s*//' | sed 's/\*\/\s*$//' | sed 's/^\s*//;s/\s*$//')
            ;;
        json)
            description="JSON configuration file"
            ;;
        sql)
            # Look for a comment
            description=$(head -20 "$file" | grep -E '^\s*--' | head -1 | sed 's/^\s*--\s*//' | sed 's/^\s*//;s/\s*$//')
            if [[ -z "$description" ]]; then
                description="SQL file"
            fi
            ;;
        md)
            # Look for the first heading
            description=$(head -20 "$file" | grep -E '^#' | head -1 | sed 's/^#\s*//' | sed 's/\s*$//')
            if [[ -z "$description" ]]; then
                # Fallback to first line
                description=$(head -1 "$file" | sed 's/^\s*//;s/\s*$//')
            fi
            ;;
        *)
            description="File"
            ;;
    esac

    # If we still don't have a description, use the filename
    if [[ -z "$description" ]]; then
        description="$filename"
    fi

    # Truncate description to 100 characters if needed
    if [[ ${#description} -gt 100 ]]; then
        description="${description:0:97}..."
    fi

    echo "$description"
}

# Write the report header
echo "# Project Structure Report" > "$REPORT_FILE"
echo "Generated on: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Process each line in the list
while IFS= read -r line; do
    # Skip empty lines
    if [[ -z "$line" ]]; then
        continue
    fi

    # Calculate depth (number of slashes)
    depth=$(echo "$line" | tr -cd '/' | wc -c)
    # Adjust depth: we start from the current directory (.) so subtract 1 for the base
    depth=$((depth - 1))

    # Create indentation
    indent=""
    for ((i=0; i<depth; i++)); do
        indent+="  "
    done

    # Get the basename
    basename=$(basename "$line")

    # Check if it's a directory
    if [[ -d "$line" ]]; then
        echo "${indent}├── $basename/" >> "$REPORT_FILE"
    else
        # Get description for the file
        description=$(get_description "$line")
        echo "${indent}├── $basename - $description" >> "$REPORT_FILE"
    fi
done < "$LIST_FILE"

echo "" >> "$REPORT_FILE"
echo "Report generated successfully." >> "$REPORT_FILE"

# Clean up temporary files
rm -f "$LIST_FILE"

# Output the report
cat "$REPORT_FILE"