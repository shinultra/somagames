
import sys

def try_extract():
    text = ""
    try:
        import pypdf
        print("Using pypdf")
        reader = pypdf.PdfReader("jpcrd426.pdf")
        for page in reader.pages:
            text += page.extract_text() + "\n"
    except ImportError:
        try:
            import PyPDF2
            print("Using PyPDF2")
            reader = PyPDF2.PdfReader("jpcrd426.pdf")
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except ImportError:
            print("No suitable PDF library found (pypdf or PyPDF2).")
            return

    with open("jpcrd426_extracted.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print(" extraction complete.")

if __name__ == "__main__":
    try_extract()
